import type { TimelineMark, TimelineRun } from '@features/timeline/types'
import type { RunSummary } from '@peerfall/game/types'
import type { LinkName, StampedMachineEvent } from '@peerfall/machine/types'
import { DETECTION_LABELS, MS_PER_SECOND, RUN_LABELS } from './timeline-run.constants'
import { timelineRunOf } from './timeline-run.util'

/** A run after the baseline is named by what it did: repaired only when it met the objectives. */
export function attemptLabelOf(passed: boolean): string {
  return passed ? RUN_LABELS.repaired : RUN_LABELS.attempt
}

/** What a saved run does not say about itself: which link broke and whose traffic was watched. */
export interface RunSetting {
  readonly faultLink: LinkName
  /** The probe's router: the one whose route moved. */
  readonly from: string
  readonly destination: string
}

/**
 * A saved run as the timeline draws it: the fault, what detected it and where, the adjacency
 * dropping, the route moving, and the first reply over the new route. Null for a run with no
 * fault in it. A moment the run never reached is left out, and its outage stays open.
 */
export function timelineRunOfSummary(label: string, summary: RunSummary, setting: RunSetting): TimelineRun | null {
  if (summary.faultAtMs === null) {
    return null
  }
  const marks: TimelineMark[] = [
    {
      kind: 'fault',
      atSeconds: 0,
      label: 'The link starts dropping every packet',
      detail: `link ${setting.faultLink[0]}–${setting.faultLink[1]}; its interfaces stay up`,
    },
  ]
  const { detection, adjacencyChange, routeUpdate, firstGoodProbe } = summary
  if (detection) {
    marks.push({
      kind: 'detection',
      atSeconds: detection.afterFaultMs / MS_PER_SECOND,
      label: DETECTION_LABELS[detection.event],
      detail: `noticed by ${detection.router} on ${detection.interface}`,
    })
  }
  if (adjacencyChange) {
    marks.push({
      kind: 'adjacency',
      atSeconds: adjacencyChange.afterFaultMs / MS_PER_SECOND,
      label: `OSPF adjacency ${adjacencyChange.from} → ${adjacencyChange.to}`,
      detail: `${adjacencyChange.router}: neighbor ${adjacencyChange.neighbor} on ${adjacencyChange.interface} (${adjacencyChange.reason})`,
    })
  }
  if (routeUpdate) {
    const { route } = routeUpdate
    marks.push({
      kind: 'route',
      atSeconds: routeUpdate.afterFaultMs / MS_PER_SECOND,
      label: 'New route installed',
      detail: `${setting.from}: ${route.prefix} ${route.via === null ? 'directly connected' : `via ${route.via}`} on ${route.interface}`,
    })
  }
  if (firstGoodProbe) {
    marks.push({
      kind: 'probe',
      atSeconds: firstGoodProbe.afterFaultMs / MS_PER_SECOND,
      label: 'First probe answered again',
      detail: `reply #${firstGoodProbe.sequence}`,
    })
  }
  // Stable, so two things logged in the same millisecond keep the order a recovery passes them.
  marks.sort((a, b) => a.atSeconds - b.atSeconds)
  return { label, marks, outageSeconds: firstGoodProbe ? firstGoodProbe.afterFaultMs / MS_PER_SECOND : null }
}

/**
 * The run being measured right now, from the Machine's events; null when no link is broken in
 * them. After a run the Machine goes back to before its fault and so do the events, so this is
 * null again and the saved run takes its lane.
 */
export function liveRunOf(
  label: string,
  events: readonly StampedMachineEvent[],
  setting: RunSetting
): TimelineRun | null {
  return events.some((event) => event.type === 'fault_injected')
    ? timelineRunOf(label, events, { from: setting.from, destination: setting.destination })
    : null
}

export interface TimelineLanes {
  readonly baseline: TimelineRun | null
  readonly repaired: TimelineRun | null
}

/**
 * Which run goes in which lane. A run in progress is drawn where it will be kept: as the baseline
 * while none is saved, otherwise beside the baseline in place of the last attempt.
 */
export function timelineLanesOf(
  baseline: TimelineRun | null,
  repaired: TimelineRun | null,
  live: TimelineRun | null
): TimelineLanes {
  if (live === null) {
    return { baseline, repaired }
  }
  return baseline === null ? { baseline: live, repaired } : { baseline, repaired: live }
}
