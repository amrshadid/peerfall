import type { MachineEvent, StampedMachineEvent } from '@peerfall/machine/types'

// Made up to lay screens out and test them: the shapes are the Machine's, the numbers are not from a run.

/** An arbitrary wall-clock start, so nothing depends on the events beginning at zero. */
const START_MS = 1_760_000_000_000
const PROBE = 'a-to-c'

type Entry = readonly [offsetMs: number, event: MachineEvent]

/** Events at offsets in milliseconds from the fault, numbered in the order they are listed. */
function stamped(entries: readonly Entry[]): StampedMachineEvent[] {
  return entries.map(
    ([offsetMs, event], seq) => ({ ...event, seq, timeMs: START_MS + offsetMs }) as StampedMachineEvent
  )
}

const viaB: MachineEvent = {
  type: 'fib_install',
  router: 'a',
  prefix: '10.255.0.3',
  via: '10.0.1.2',
  interface: 'a-b',
  nextHops: [{ via: '10.0.1.2', interface: 'a-b' }],
  protocol: 'ospf',
}

const healthyProbes: readonly Entry[] = [
  [-199, { type: 'probe_received', probe: PROBE, sequence: 1, rttMs: 0.4 }],
  [-99, { type: 'probe_received', probe: PROBE, sequence: 2, rttMs: 0.4 }],
]

const faultAndFirstLoss: readonly Entry[] = [
  [0, { type: 'fault_injected', link: ['a', 'c'] }],
  [200, { type: 'probe_lost', probe: PROBE, sequence: 3 }],
]

/** No BFD: nothing notices the fault until OSPF's dead timer runs out. */
export const BASELINE_EVENTS: readonly StampedMachineEvent[] = stamped([
  ...healthyProbes,
  ...faultAndFirstLoss,
  [37_600, { type: 'ospf_dead_timer_expired', router: 'a', neighbor: '10.255.0.3', interface: 'a-c' }],
  [
    37_600,
    {
      type: 'ospf_adjacency_change',
      router: 'a',
      neighbor: '10.255.0.3',
      address: '10.0.2.2',
      interface: 'a-c',
      from: 'Full',
      to: 'Deleted',
      reason: 'InactivityTimer',
    },
  ],
  [37_720, viaB],
  [37_801, { type: 'probe_received', probe: PROBE, sequence: 380, rttMs: 0.7 }],
])

/**
 * BFD on both ends: the session goes down within its detection time and OSPF follows at once. Listed
 * out of time order on purpose: a log line reaches the game later than a probe's reply does.
 */
export const REPAIRED_EVENTS: readonly StampedMachineEvent[] = stamped([
  ...healthyProbes,
  ...faultAndFirstLoss,
  [901, { type: 'probe_received', probe: PROBE, sequence: 11, rttMs: 0.7 }],
  [810, { type: 'bfd_session_down', router: 'a', peer: '10.0.2.2', interface: 'a-c', reason: 'control-expired' }],
  [
    812,
    {
      type: 'ospf_adjacency_change',
      router: 'a',
      neighbor: '10.255.0.3',
      address: '10.0.2.2',
      interface: 'a-c',
      from: 'Full',
      to: 'Deleted',
      reason: 'InactivityTimer',
    },
  ],
  [880, viaB],
])

/** A run still in its outage: the fault is in, nothing has noticed yet. */
export const ONGOING_EVENTS: readonly StampedMachineEvent[] = stamped([...healthyProbes, ...faultAndFirstLoss])

/** The network before any fault. */
export const HEALTHY_EVENTS: readonly StampedMachineEvent[] = stamped([...healthyProbes])
