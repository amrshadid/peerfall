import type { Validated } from '@peerfall/core/types'
import type { MissionDefinition, MissionVerdict } from '@peerfall/game/types'
import { stateRequestOf } from '@peerfall/game/utils'
import type {
  LinkDefinition,
  MachineState,
  NetworkDefinition,
  ProbeDefinition,
  StampedMachineEvent,
  StateRequest,
} from '@peerfall/machine/types'
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
  /** The Machine as it is now, read as root: the parts of each router and the pings a mission's checks need. */
  readonly readState: (request: StateRequest) => Promise<Validated<MachineState>>
  /** Stops a router's FRR and starts it again from its saved frr.conf. */
  readonly restartFrr: (router: string) => Promise<Validated<null>>
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
 * destination when that is a router's loopback. A network with no OSPF and no probe has nothing
 * to converge: it only has to stay unchanged.
 */
export function networkConverged(
  network: NetworkDefinition,
  probe: ProbeDefinition | undefined,
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
  // A route the player is asked to add (a static route to a link's address) is not waited for.
  if (!probe || !network.routers.some(({ loopback }) => loopback === `${probe.destination}/32`)) {
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

/** The network's link that a fault names by its two routers; none for a mission that breaks nothing. */
export function faultLink(mission: Pick<MissionDefinition, 'network' | 'fault'>): LinkDefinition | undefined {
  if (!mission.fault) {
    return undefined
  }
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

// A mission may have no probe, no fault or nothing to read: asking for one is answered, not thrown.
const NO_PROBE: RunOutcome = { ok: false, errors: ['This mission has no probe to send.'] }
const NO_FAULT: RunOutcome = { ok: false, errors: ['This mission has no fault to run.'] }

/** A probe on the network as it is, with no fault: evidence for "a reaches c" and "which way". */
export async function probeRun(
  machine: MissionMachine,
  mission: Pick<MissionDefinition, 'probe'>,
  timings: RunTimings = DEFAULT_RUN_TIMINGS
): Promise<RunOutcome> {
  const { probe } = mission
  if (!probe) {
    return NO_PROBE
  }
  const started = await machine.startProbe(probe)
  if (!started.ok) {
    return started
  }
  await machine.wait(timings.beforeFaultMs)
  await machine.stopProbe(probe.id)
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
  const { fault, probe } = mission
  if (!fault) {
    return NO_FAULT
  }
  if (!probe) {
    return NO_PROBE
  }
  const link = faultLink(mission)
  if (!link) {
    return { ok: false, errors: [`The network has no link ${fault.link.join('–')}`] }
  }
  if (!(await machine.saveHealthy(RUN_SLOT))) {
    return { ok: false, errors: ['The Machine could not be saved before the fault'] }
  }
  const started = await machine.startProbe(probe)
  if (!started.ok) {
    return started
  }
  await machine.wait(timings.beforeFaultMs)
  if (!(await machine.setFault(link, true))) {
    await machine.stopProbe(probe.id)
    return { ok: false, errors: ['The fault could not be injected'] }
  }
  let waited = 0
  while (waited < timings.giveUpAfterMs && !recovered(machine.events(), probe.id, timings.recoveredForMs)) {
    await machine.wait(timings.pollMs)
    waited += timings.pollMs
  }
  await machine.stopProbe(probe.id)
  await machine.wait(timings.logLagMs)
  const events = [...machine.events()]
  await machine.restoreHealthy(RUN_SLOT)
  return { ok: true, events }
}

export type CheckOutcome =
  | {
      readonly ok: true
      readonly events: readonly StampedMachineEvent[]
      /** The Machine as the checks found it. */
      readonly state: MachineState
    }
  | { readonly ok: false; readonly errors: readonly string[] }

/** Waits until nothing about routing has changed for a while; false when it never stopped changing. */
async function waitUntilQuiet(machine: MissionMachine, timings: RunTimings): Promise<boolean> {
  let waited = 0
  let quietFor = 0
  let seen = routingChanges(machine.events())
  while (waited < timings.settleTimeoutMs) {
    await machine.wait(timings.pollMs)
    waited += timings.pollMs
    const changes = routingChanges(machine.events())
    quietFor = changes === seen ? quietFor + timings.pollMs : 0
    seen = changes
    if (quietFor >= timings.settleMs) {
      return true
    }
  }
  return false
}

/**
 * Reads what a mission's state checks need from the Machine as it is now, as live judging does
 * after each command the player finishes: nothing is restarted, nothing is waited for. Judging is
 * the caller's, with `judgeMission(mission, events, state)`.
 */
export async function liveRead(
  machine: Pick<MissionMachine, 'events' | 'readState'>,
  mission: Pick<MissionDefinition, 'objectives'>
): Promise<CheckOutcome> {
  const request = stateRequestOf(mission)
  if (!request) {
    return { ok: false, errors: ['This mission is checked by running its fault, not by reading the network.'] }
  }
  const state = await machine.readState(request)
  if (!state.ok) {
    return state
  }
  // The events as they are once the read is back: anything the read itself caused is in them.
  return { ok: true, events: [...machine.events()], state: state.value }
}

/**
 * The play-through's verdict so far: an objective met by any judging stays met, as in Kernelfall,
 * since a mission's objectives can be shown one command at a time. The others are the latest's.
 */
export function keepMet(previous: MissionVerdict | null, latest: MissionVerdict): MissionVerdict {
  if (previous === null) {
    return latest
  }
  const objectives = latest.objectives.map(
    (objective) =>
      previous.objectives.find(({ objectiveId, result }) => objectiveId === objective.objectiveId && result.passed) ??
      objective
  )
  return { passed: objectives.length > 0 && objectives.every(({ result }) => result.passed), objectives }
}

/** Routing changes so far, for knowing when a configuration has finished reaching the kernel. */
export const routingChangeCount = (events: readonly StampedMachineEvent[]): number => routingChanges(events)

/**
 * Checks the player's work on a mission whose checks read the Machine's state: FRR is restarted
 * on the routers the mission says survive one, the network is left to settle, and the state the
 * checks need is read as root. Nothing is undone afterwards: what the player configured stays, and
 * what a restart lost stays lost. Judging is the caller's, with `judgeMission(mission, events, state)`.
 */
export async function checkRun(
  machine: MissionMachine,
  mission: Pick<MissionDefinition, 'objectives' | 'restartOnCheck'>,
  timings: RunTimings = DEFAULT_RUN_TIMINGS
): Promise<CheckOutcome> {
  if (!stateRequestOf(mission)) {
    return { ok: false, errors: ['This mission is checked by running its fault, not by reading the network.'] }
  }
  for (const router of mission.restartOnCheck ?? []) {
    const restarted = await machine.restartFrr(router)
    if (!restarted.ok) {
      return restarted
    }
  }
  return settledRead(machine, mission, timings)
}

/**
 * What live judging finds once the player has stopped typing and routing has gone quiet: the
 * network is left to settle, then read as `liveRead` reads it. Nothing is restarted. The golden
 * runs judge a mission this way, after the scripted player's last change.
 */
export async function settledRead(
  machine: MissionMachine,
  mission: Pick<MissionDefinition, 'objectives'>,
  timings: RunTimings = DEFAULT_RUN_TIMINGS
): Promise<CheckOutcome> {
  if (!stateRequestOf(mission)) {
    return { ok: false, errors: ['This mission is checked by running its fault, not by reading the network.'] }
  }
  // A router that was just configured or restarted is still handing its routes to the kernel.
  if (!(await waitUntilQuiet(machine, timings))) {
    return { ok: false, errors: ['The network did not settle. Try again.'] }
  }
  return liveRead(machine, mission)
}
