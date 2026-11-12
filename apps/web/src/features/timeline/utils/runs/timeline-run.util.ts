import type { TimelineAxis, TimelineMark, TimelineRun } from '@features/timeline/types'
import type { StampedMachineEvent } from '@peerfall/machine/types'
import { AXIS_STEPS, EMPTY_AXIS_SECONDS, MAX_AXIS_TICKS, MS_PER_SECOND } from './timeline-run.constants'

type EventOf<Type extends StampedMachineEvent['type']> = Extract<StampedMachineEvent, { readonly type: Type }>

/**
 * A run's moments, read from the Machine's events: the earliest fault, then the first of each thing a
 * recovery passes after it. Null when the events hold no fault. A moment that hasn't happened yet is
 * left out, and the outage is unknown until a probe gets through again.
 */
export function timelineRunOf(
  label: string,
  events: readonly StampedMachineEvent[],
  /** Whose route to where counts as the route update; any router's first new route when left out. */
  traffic?: { readonly from: string; readonly destination: string }
): TimelineRun | null {
  const fault = events
    .filter((event): event is EventOf<'fault_injected'> => event.type === 'fault_injected')
    .reduce<EventOf<'fault_injected'> | null>(
      (first, event) => (first && first.timeMs <= event.timeMs ? first : event),
      null
    )
  if (!fault) {
    return null
  }
  // By the Machine's clock, not by arrival: a log line is read later than it was written.
  const after = events
    .filter((event) => event !== fault && event.timeMs >= fault.timeMs)
    .sort((a, b) => a.timeMs - b.timeMs)
  const secondsAt = (event: StampedMachineEvent) => (event.timeMs - fault.timeMs) / MS_PER_SECOND
  const first = <Type extends StampedMachineEvent['type']>(
    type: Type,
    from: readonly StampedMachineEvent[] = after
  ): EventOf<Type> | undefined => from.find((event): event is EventOf<Type> => event.type === type)

  const marks: TimelineMark[] = [
    {
      kind: 'fault',
      atSeconds: 0,
      label: 'The link starts dropping every packet',
      detail: `link ${fault.link[0]}–${fault.link[1]}; its interfaces stay up`,
    },
  ]

  // Whichever noticed first: BFD's detection time, or OSPF's dead interval.
  const detection = after.find(
    (event): event is EventOf<'bfd_session_down'> | EventOf<'ospf_dead_timer_expired'> =>
      event.type === 'bfd_session_down' || event.type === 'ospf_dead_timer_expired'
  )
  if (detection?.type === 'bfd_session_down') {
    marks.push({
      kind: 'detection',
      atSeconds: secondsAt(detection),
      label: 'BFD session down',
      detail: `${detection.router}: peer ${detection.peer} on ${detection.interface}, ${detection.reason}`,
    })
  } else if (detection) {
    marks.push({
      kind: 'detection',
      atSeconds: secondsAt(detection),
      label: 'OSPF dead timer expired',
      detail: `${detection.router}: neighbor ${detection.neighbor} on ${detection.interface}`,
    })
  }

  const adjacency = after.find(
    (event): event is EventOf<'ospf_adjacency_change'> =>
      event.type === 'ospf_adjacency_change' && event.from === 'Full'
  )
  if (adjacency) {
    marks.push({
      kind: 'adjacency',
      atSeconds: secondsAt(adjacency),
      label: `OSPF adjacency ${adjacency.from} → ${adjacency.to}`,
      detail: `${adjacency.router}: neighbor ${adjacency.neighbor} on ${adjacency.interface} (${adjacency.reason})`,
    })
  }

  const route = first(
    'fib_install',
    traffic
      ? after.filter(
          (event) =>
            event.type === 'fib_install' &&
            event.router === traffic.from &&
            (event.prefix === traffic.destination || event.prefix === `${traffic.destination}/32`)
        )
      : after
  )
  if (route) {
    marks.push({
      kind: 'route',
      atSeconds: secondsAt(route),
      label: 'New route installed',
      detail: `${route.router}: ${route.prefix} ${route.via === null ? 'directly connected' : `via ${route.via}`} on ${route.interface}`,
    })
  }

  // A reply only counts as recovery once one was lost: replies already on their way arrive after the fault too.
  const lost = first('probe_lost')
  const good = lost
    ? first(
        'probe_received',
        after.filter((event) => event.timeMs > lost.timeMs)
      )
    : undefined
  if (good) {
    marks.push({
      kind: 'probe',
      atSeconds: secondsAt(good),
      label: 'First probe answered again',
      detail: `${good.probe} #${good.sequence}, ${good.rttMs} ms`,
    })
  }

  // Stable, so two things logged in the same millisecond keep the order a recovery passes them.
  marks.sort((a, b) => a.atSeconds - b.atSeconds)
  return { label, marks, outageSeconds: good ? secondsAt(good) : null }
}

/** Two decimals under ten seconds, one above: `0.90 s`, `37.8 s`. Enough to compare, never falsely exact. */
export function formatSeconds(seconds: number): string {
  const digits = Math.abs(seconds) < 10 ? 2 : 1
  return `${seconds.toFixed(digits)} s`
}

/** The axis's own labels, without trailing zeros: `0`, `0.5`, `10`. */
export function formatAxisSeconds(seconds: number): string {
  return String(Math.round(seconds * 100) / 100)
}

/** One axis for every run given, ending on a round number at or past the last mark and the target. */
export function timelineAxisOf(
  runs: readonly (TimelineRun | null)[],
  targetSeconds: number | null = null
): TimelineAxis {
  const times = runs.flatMap((run) => run?.marks.map((mark) => mark.atSeconds) ?? [])
  const last = Math.max(0, targetSeconds ?? 0, ...times)
  const span = last > 0 ? last : EMPTY_AXIS_SECONDS
  const step = AXIS_STEPS.find((candidate) => span / candidate <= MAX_AXIS_TICKS - 1) ?? span
  const count = Math.max(1, Math.ceil(span / step - 1e-9))
  // Rounded: steps like 0.1 don't add up exactly in binary.
  const ticks = Array.from({ length: count + 1 }, (_, index) => Math.round(index * step * 100) / 100)
  return { endSeconds: ticks[count] ?? span, ticks }
}

/** Where a time falls on the axis, in percent of its length, kept on the axis. */
export function axisPercent(seconds: number, axis: TimelineAxis): number {
  if (axis.endSeconds <= 0) {
    return 0
  }
  return Math.round(Math.min(1, Math.max(0, seconds / axis.endSeconds)) * 10_000) / 100
}

/** The run in one sentence, with the outage's length in seconds. */
export function outageSentence(run: TimelineRun, targetSeconds: number | null = null): string {
  if (run.outageSeconds === null) {
    return `${run.label}: traffic is still being lost.`
  }
  const lost = `${run.label}: traffic was lost for ${formatSeconds(run.outageSeconds)}`
  if (targetSeconds === null) {
    return `${lost}.`
  }
  const target = formatSeconds(targetSeconds)
  return run.outageSeconds < targetSeconds
    ? `${lost}, inside the ${target} target.`
    : `${lost}, over the ${target} target.`
}

/** What the change bought, in seconds; null unless both runs recovered. */
export function comparisonSentence(baseline: TimelineRun | null, repaired: TimelineRun | null): string | null {
  if (!baseline || !repaired || baseline.outageSeconds === null || repaired.outageSeconds === null) {
    return null
  }
  const saved = baseline.outageSeconds - repaired.outageSeconds
  if (saved > 0) {
    return `${repaired.label} recovered ${formatSeconds(saved)} sooner than ${baseline.label.toLowerCase()}.`
  }
  return saved < 0
    ? `${repaired.label} recovered ${formatSeconds(-saved)} later than ${baseline.label.toLowerCase()}.`
    : `${repaired.label} recovered no sooner than ${baseline.label.toLowerCase()}.`
}
