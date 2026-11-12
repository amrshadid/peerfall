import type { Validated } from '@peerfall/core/types'
import type { MissionDefinition } from '@peerfall/game/types'
import type { LinkDefinition, NetworkDefinition, ProbeDefinition, StampedMachineEvent } from '@peerfall/machine/types'
import { interfaceName } from '@peerfall/machine/utils'

/** What a mission's flow does to the Machine: the browser's connection, or a session in Node. */
export interface MissionMachine {
  /** Everything reported since the network was built, in the order it happened. */
  readonly events: () => readonly StampedMachineEvent[]
  readonly setFault: (link: LinkDefinition, dropping: boolean) => Promise<boolean>
  readonly startProbe: (probe: ProbeDefinition) => Promise<Validated<null>>
  readonly stopProbe: (id: string) => Promise<void>
  readonly saveHealthy: (slot: string) => Promise<boolean>
  readonly restoreHealthy: (slot: string) => Promise<boolean>
  readonly wait: (ms: number) => Promise<void>
}

/** The network as it was first built and converged: where "start over" goes back to. */
export const START_SLOT = 'start'
/** The network as the player configured it, just before a fault: where the Machine returns after the run. */
export const RUN_SLOT = 'run'

export interface RunTimings {
  /** Probe replies collected on the healthy network before the fault, so "before" has evidence. */
  readonly beforeFaultMs: number
  /** Replies must keep coming this long before the run counts as recovered. */
  readonly recoveredForMs: number
  /** OSPF's dead timer is 40 s: a run with nothing faster to detect the fault needs this long. */
  readonly giveUpAfterMs: number
  /** FRR's log lines reach the game up to a second after they were written. */
  readonly logLagMs: number
  readonly pollMs: number
  /** A network counts as settled when it met the conditions and nothing changed for this long. */
  readonly settleMs: number
  readonly settleTimeoutMs: number
}

export const DEFAULT_RUN_TIMINGS: RunTimings = {
  beforeFaultMs: 3000,
  recoveredForMs: 1500,
  giveUpAfterMs: 55_000,
  logLagMs: 1500,
  pollMs: 250,
  settleMs: 3000,
  settleTimeoutMs: 180_000,
}

const runsOspf = (network: NetworkDefinition, router: string): boolean =>
  network.routers.some(({ name, daemons }) => name === router && daemons.includes('ospfd'))

/**
 * Whether the network has converged, as far as its events tell: every link between two OSPF
 * routers has a Full adjacency on both ends, and the probe's router has a route to the probe's
 * destination when that is a router's loopback.
 */
export function networkConverged(
  network: NetworkDefinition,
  probe: ProbeDefinition,
  events: readonly StampedMachineEvent[]
): boolean {
  for (const { ends } of network.links) {
    const [first, second] = ends
    if (!runsOspf(network, first.router) || !runsOspf(network, second.router)) {
      continue
    }
    for (const [router, peer] of [
      [first.router, second.router],
      [second.router, first.router],
    ] as const) {
      const name = interfaceName(router, peer)
      const last = events.findLast(
        (event) => event.type === 'ospf_adjacency_change' && event.router === router && event.interface === name
      )
      if (last?.type !== 'ospf_adjacency_change' || last.to !== 'Full') {
        return false
      }
    }
  }
  const isLoopback = network.routers.some(({ loopback }) => loopback === `${probe.destination}/32`)
  if (!isLoopback) {
    return true
  }
  const route = events.findLast(
    (event) =>
      (event.type === 'fib_install' || event.type === 'fib_remove') &&
      event.router === probe.from &&
      event.prefix === probe.destination
  )
  return route?.type === 'fib_install'
}

/** Routing changes only: a probe's replies arrive all the time and say nothing about convergence. */
const routingChanges = (events: readonly StampedMachineEvent[]): number =>
  events.filter((event) => event.type !== 'probe_received' && event.type !== 'probe_lost').length

/** Waits until the network has converged and then stayed unchanged; false when it never did. */
export async function waitUntilSettled(
  machine: MissionMachine,
  mission: Pick<MissionDefinition, 'network' | 'probe'>,
  timings: RunTimings = DEFAULT_RUN_TIMINGS
): Promise<boolean> {
  let waited = 0
  let quietFor = 0
  let seen = -1
  while (waited < timings.settleTimeoutMs) {
    const events = machine.events()
    const changes = routingChanges(events)
    if (networkConverged(mission.network, mission.probe, events) && changes === seen) {
      quietFor += timings.pollMs
      if (quietFor >= timings.settleMs) {
        return true
      }
    } else {
      quietFor = 0
    }
    seen = changes
    await machine.wait(timings.pollMs)
    waited += timings.pollMs
  }
  return false
}

/** The network's link that a fault names by its two routers. */
export function faultLink(mission: Pick<MissionDefinition, 'network' | 'fault'>): LinkDefinition | undefined {
  const [first, second] = mission.fault.link
  return mission.network.links.find(({ ends }) => ends[0].router === first && ends[1].router === second)
}

/** Whether replies have been coming back, without a gap, for `forMs` after the fault. */
function recovered(events: readonly StampedMachineEvent[], probe: string, forMs: number): boolean {
  const fault = events.findLast((event) => event.type === 'fault_injected')
  if (!fault) {
    return false
  }
  const after = events.filter(
    (event) =>
      (event.type === 'probe_received' || event.type === 'probe_lost') &&
      event.probe === probe &&
      event.timeMs > fault.timeMs
  )
  const lastLoss = after.findLastIndex((event) => event.type === 'probe_lost')
  const replies = after.slice(lastLoss + 1)
  const first = replies[0]
  const last = replies.at(-1)
  // A loss has to be seen first: until then the replies are the ones already on their way.
  return lastLoss !== -1 && first !== undefined && last !== undefined && last.timeMs - first.timeMs >= forMs
}

export type RunOutcome =
  | { readonly ok: true; readonly events: readonly StampedMachineEvent[] }
  | { readonly ok: false; readonly errors: readonly string[] }

/** A probe on the network as it is, with no fault: evidence for "a reaches c" and "which way". */
export async function probeRun(
  machine: MissionMachine,
  mission: Pick<MissionDefinition, 'probe'>,
  timings: RunTimings = DEFAULT_RUN_TIMINGS
): Promise<RunOutcome> {
  const started = await machine.startProbe(mission.probe)
  if (!started.ok) {
    return started
  }
  await machine.wait(timings.beforeFaultMs)
  await machine.stopProbe(mission.probe.id)
  await machine.wait(timings.pollMs)
  return { ok: true, events: [...machine.events()] }
}

/**
 * One fault, start to finish: the network as it is now is kept, a probe starts, the link stops
 * passing packets, and the run lasts until traffic is back or nothing is going to bring it back.
 * Then the Machine returns to the kept network, with whatever the player configured, ready for
 * another run. The events it returns are the whole story, with this run's fault the only one.
 */
export async function faultRun(
  machine: MissionMachine,
  mission: Pick<MissionDefinition, 'network' | 'fault' | 'probe'>,
  timings: RunTimings = DEFAULT_RUN_TIMINGS
): Promise<RunOutcome> {
  const link = faultLink(mission)
  if (!link) {
    return { ok: false, errors: [`The network has no link ${mission.fault.link.join('–')}`] }
  }
  if (!(await machine.saveHealthy(RUN_SLOT))) {
    return { ok: false, errors: ['The Machine could not be saved before the fault'] }
  }
  const started = await machine.startProbe(mission.probe)
  if (!started.ok) {
    return started
  }
  await machine.wait(timings.beforeFaultMs)
  if (!(await machine.setFault(link, true))) {
    await machine.stopProbe(mission.probe.id)
    return { ok: false, errors: ['The fault could not be injected'] }
  }
  let waited = 0
  while (waited < timings.giveUpAfterMs && !recovered(machine.events(), mission.probe.id, timings.recoveredForMs)) {
    await machine.wait(timings.pollMs)
    waited += timings.pollMs
  }
  await machine.stopProbe(mission.probe.id)
  await machine.wait(timings.logLagMs)
  const events = [...machine.events()]
  await machine.restoreHealthy(RUN_SLOT)
  return { ok: true, events }
}
