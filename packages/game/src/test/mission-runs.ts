import type { MachineEvent, StampedMachineEvent } from '@peerfall/machine/types'

/** A hand-written event at `atMs` after the fault (negative before it). */
type Sketch = MachineEvent extends infer Event
  ? Event extends MachineEvent
    ? Event & { readonly atMs: number }
    : never
  : never

/** The Machine's clock when each fixture's fault is injected. */
export const FAULT_AT_MS = 1_800_000_005_000

const PROBE = 'a-to-c'
const INTERVAL_MS = 50
/** FRR's log lines reach the game later than route and probe lines do, so `seq` is not time order. */
const LOG_DELAY_MS = 400

const isLogLine = (event: MachineEvent): boolean => event.type.startsWith('bfd_') || event.type.startsWith('ospf_')

/** Stamps sketches as the stream would: `timeMs` when it happened, `seq` in the order it arrived. */
export function stamped(sketches: readonly Sketch[]): StampedMachineEvent[] {
  const arrival = (sketch: Sketch): number => sketch.atMs + (isLogLine(sketch) ? LOG_DELAY_MS : 0)
  return [...sketches]
    .sort((first, second) => arrival(first) - arrival(second))
    .map((sketch, seq) => ({ ...sketch, seq, timeMs: FAULT_AT_MS + sketch.atMs }))
}

const route = (router: string, prefix: string, via: string, dev: string, atMs: number): Sketch => ({
  type: 'fib_install',
  router,
  prefix,
  via,
  interface: dev,
  nextHops: [{ via, interface: dev }],
  protocol: 'ospf',
  atMs,
})

const HEALTHY_SINCE_MS = -5000

/** The converged triangle: a reaches c's loopback over the direct link, and c reaches a's the same way. */
const healthyRoutes = (): Sketch[] => [
  route('a', '10.255.0.2', '10.0.1.2', 'a-b', HEALTHY_SINCE_MS),
  route('a', '10.255.0.3', '10.0.2.2', 'a-c', HEALTHY_SINCE_MS),
  {
    type: 'fib_install',
    router: 'a',
    prefix: '10.0.3.0/30',
    via: '10.0.1.2',
    interface: 'a-b',
    // The far link is two equal-cost hops away either way round.
    nextHops: [
      { via: '10.0.1.2', interface: 'a-b' },
      { via: '10.0.2.2', interface: 'a-c' },
    ],
    protocol: 'ospf',
    atMs: HEALTHY_SINCE_MS,
  },
  route('c', '10.255.0.1', '10.0.2.1', 'c-a', HEALTHY_SINCE_MS),
]

const bfdSessionsUp = (): Sketch[] => [
  { type: 'bfd_session_up', router: 'a', peer: '10.0.2.2', interface: 'a-c', atMs: -4500 },
  { type: 'bfd_session_up', router: 'c', peer: '10.0.2.1', interface: 'c-a', atMs: -4480 },
]

/** What one end of the broken link logged and did, at times after the fault. */
interface EndTimes {
  /** BFD's session going down or the dead timer expiring, whichever this run has. */
  readonly detectedMs: number
  readonly adjacencyMs: number
  readonly routeMs: number
}

interface FaultRun {
  readonly detector: 'bfd_session_down' | 'ospf_dead_timer_expired'
  readonly bfdSessions: boolean
  /** The last reply before the fault (negative). */
  readonly lastReplyMs: number
  readonly a: EndTimes
  readonly c: EndTimes
  /** The first reply over the backup path. */
  readonly firstReplyMs: number
}

function endEvents(run: FaultRun, router: 'a' | 'c'): Sketch[] {
  const near = router === 'a'
  const times = near ? run.a : run.c
  const dev = near ? 'a-c' : 'c-a'
  const address = near ? '10.0.2.2' : '10.0.2.1'
  const neighbor = near ? '10.255.0.3' : '10.255.0.1'
  const detection: Sketch =
    run.detector === 'bfd_session_down'
      ? {
          type: 'bfd_session_down',
          router,
          peer: address,
          interface: dev,
          reason: 'control-expired',
          atMs: times.detectedMs,
        }
      : { type: 'ospf_dead_timer_expired', router, neighbor, interface: dev, atMs: times.detectedMs }
  return [
    detection,
    {
      type: 'ospf_adjacency_change',
      router,
      neighbor,
      address,
      interface: dev,
      from: 'Full',
      to: 'Deleted',
      // FRR gives this reason for a BFD-triggered drop too.
      reason: 'InactivityTimer',
      atMs: times.adjacencyMs,
    },
    near
      ? route('a', '10.255.0.3', '10.0.1.2', 'a-b', times.routeMs)
      : route('c', '10.255.0.1', '10.0.3.1', 'c-b', times.routeMs),
  ]
}

function probeEvents(run: FaultRun): Sketch[] {
  const events: Sketch[] = []
  let sequence = 1
  const reply = (atMs: number) =>
    events.push({ type: 'probe_received', probe: PROBE, sequence: sequence++, rttMs: 0.9, atMs })
  const healthyReplies = Math.floor((run.lastReplyMs + 3000) / INTERVAL_MS)
  for (let before = healthyReplies; before >= 0; before--) {
    reply(run.lastReplyMs - before * INTERVAL_MS)
  }
  // A packet is reported lost when the next one is due, and every one sent before a's route moved is.
  for (let sentMs = run.lastReplyMs + INTERVAL_MS; sentMs < run.a.routeMs; sentMs += INTERVAL_MS) {
    events.push({ type: 'probe_lost', probe: PROBE, sequence: sequence++, atMs: sentMs + INTERVAL_MS })
  }
  for (let after = 0; after < 20; after++) {
    reply(run.firstReplyMs + after * INTERVAL_MS)
  }
  return events
}

function faultRun(run: FaultRun): StampedMachineEvent[] {
  return stamped([
    ...healthyRoutes(),
    ...(run.bfdSessions ? bfdSessionsUp() : []),
    ...probeEvents(run),
    { type: 'fault_injected', link: ['a', 'c'], atMs: 0 },
    ...endEvents(run, 'a'),
    ...endEvents(run, 'c'),
  ])
}

/** The healthy network with the probe running and no fault yet. */
export const healthyRun = (): StampedMachineEvent[] =>
  stamped([
    ...healthyRoutes(),
    ...Array.from(
      { length: 40 },
      (_, at): Sketch => ({
        type: 'probe_received',
        probe: PROBE,
        sequence: at + 1,
        rttMs: 0.9,
        atMs: -3000 + at * INTERVAL_MS,
      })
    ),
  ])

export const BASELINE_OUTAGE_MS = 34_970

/**
 * No BFD: each end waits for its OSPF dead timer. The outage is the one measured on the Machine
 * (34.97 s). c's timer expires first because its last hello from a came earlier; traffic is back
 * only when a has moved its route too.
 */
export const baselineRun = (): StampedMachineEvent[] =>
  faultRun({
    detector: 'ospf_dead_timer_expired',
    bfdSessions: false,
    lastReplyMs: -30,
    c: { detectedMs: 31_210, adjacencyMs: 31_214, routeMs: 31_240 },
    a: { detectedMs: 34_900, adjacencyMs: 34_904, routeMs: 34_930 },
    firstReplyMs: 34_940,
  })

export const BFD_ONE_END_OUTAGE_MS = 37_461

/**
 * BFD configured on a only: c never answers, so a's session never comes up and never goes down.
 * Both ends still wait for the dead timer. Not measured on the Machine yet: the times are a dead
 * interval's worth, like the baseline's.
 */
export const bfdOneEndRun = (): StampedMachineEvent[] =>
  faultRun({
    detector: 'ospf_dead_timer_expired',
    bfdSessions: false,
    lastReplyMs: -20,
    c: { detectedMs: 33_105, adjacencyMs: 33_109, routeMs: 33_131 },
    a: { detectedMs: 37_402, adjacencyMs: 37_406, routeMs: 37_433 },
    firstReplyMs: 37_441,
  })

export const BFD_OUTAGE_MS = 834
export const BFD_RECOVERY_MS = 796

/**
 * BFD on both ends, as measured on the Machine: the far end's session expired first, c dropped the
 * adjacency and flooded the change through b, so a moved its route (+765 ms) and replies were back
 * (+796 ms) before a's own BFD timer fired (+995 ms). c's own times weren't captured: they are
 * placed before a's route change, where they must have been. `laterMs` moves everything after the
 * fault, to reach the fastest (671 ms) and slowest (1157 ms) outages measured.
 */
export const bfdBothEndsRun = (laterMs = 0): StampedMachineEvent[] =>
  faultRun({
    detector: 'bfd_session_down',
    bfdSessions: true,
    lastReplyMs: -38,
    c: { detectedMs: 731 + laterMs, adjacencyMs: 738 + laterMs, routeMs: 752 + laterMs },
    a: { detectedMs: 995 + laterMs, adjacencyMs: 1001 + laterMs, routeMs: 765 + laterMs },
    firstReplyMs: BFD_RECOVERY_MS + laterMs,
  })

/**
 * BFD on both ends, another measured run: a's own session expired first (+614 ms), then its
 * adjacency (+627 ms), its route (+648 ms) and the first reply (+651 ms); the last reply before
 * the fault was 180 ms earlier.
 */
export const bfdNearEndFirstRun = (): StampedMachineEvent[] =>
  faultRun({
    detector: 'bfd_session_down',
    bfdSessions: true,
    lastReplyMs: -180,
    a: { detectedMs: 614, adjacencyMs: 627, routeMs: 648 },
    c: { detectedMs: 640, adjacencyMs: 646, routeMs: 649 },
    firstReplyMs: 651,
  })
