import type { GuideStatus } from '@features/guide/types'
import type { ProbeNames } from '@features/guide/utils/objectives'
import { type MissionDefinition, STATE_CHECK_KINDS } from '@peerfall/game/types'
import type { MissionRunPhase } from '@peerfall/missions/hooks'

/** `a–c`, or plain words in a mission that breaks nothing. */
const linkText = (mission: Pick<MissionDefinition, 'fault'>): string => mission.fault?.link.join('–') ?? 'under test'

const runsOspf = (mission: Pick<MissionDefinition, 'network'>): boolean =>
  mission.network.routers.some((router) => router.daemons.includes('ospfd'))

/**
 * What the network is doing, for the line over the actions. Null while it is the player's to use.
 * The lengths are the Machine's measured ones: a fault run ends when traffic is back, or when
 * nothing is going to bring it back.
 */
export function runStatusOf(
  phase: MissionRunPhase,
  errors: readonly string[],
  mission: Pick<MissionDefinition, 'fault' | 'probe' | 'network' | 'restartOnCheck'>,
  names: ProbeNames
): GuideStatus | null {
  const every = mission.probe ? ` every ${mission.probe.intervalMs} ms` : ''
  switch (phase) {
    case 'building':
      return {
        text: 'Starting the routers… about a minute the first time. Linux boots in your browser, then FRR starts on each router.',
        busy: true,
        failed: false,
        details: [],
      }
    case 'settling':
      return {
        text: runsOspf(mission)
          ? 'The routers are up and finding each other: each pair becomes OSPF neighbors and they share their routes. A few seconds more.'
          : 'The routers are up and FRR is settling on each of them. A few seconds more.',
        busy: true,
        failed: false,
        details: [],
      }
    case 'probing':
      return {
        text: `Sending the probe: one packet from ${names.from} to ${names.destination}${every}, for about three seconds.`,
        busy: true,
        failed: false,
        details: [],
      }
    case 'faulted':
      return {
        text: `The probe runs for about three seconds, then the link ${linkText(mission)} starts dropping every packet and the outage is measured. This takes about 4 to 6 seconds when BFD runs on both ends of the link, and up to about a minute without it. The network then goes back to how you had configured it; what you change during the run is not kept.`,
        busy: true,
        failed: false,
        details: [],
      }
    case 'checking': {
      const restarted = mission.restartOnCheck ?? []
      const restart =
        restarted.length > 0
          ? `FRR is restarted on ${restarted.length === 1 ? 'router' : 'routers'} ${restarted.join(' and ')} from the saved configuration, so only what survives a restart counts. Then `
          : ''
      return {
        text: `Checking your work. ${restart === '' ? 'The' : `${restart}the`} routers are read as they are: their daemons, their routes, their configuration. Nothing is undone afterwards.`,
        busy: true,
        failed: false,
        details: [],
      }
    }
    case 'failed':
      return {
        text: 'The network could not be started. Reload the page to try again.',
        busy: false,
        failed: true,
        details: errors,
      }
    case 'ready':
      return errors.length > 0
        ? { text: 'The last run could not be finished.', busy: false, failed: true, details: errors }
        : null
  }
}

/** Why an action waits, as its button says it; null when the network is the player's to use. */
export function waitReasonOf(phase: MissionRunPhase): string | null {
  switch (phase) {
    case 'building':
    case 'settling':
      return 'The routers are still starting.'
    case 'probing':
      return 'A probe is being sent.'
    case 'faulted':
      return 'A run is being measured.'
    case 'checking':
      return 'Your work is being checked.'
    case 'failed':
      return 'The network could not be started.'
    case 'ready':
      return null
  }
}

/** Whether an objective is judged from the routers as they are, rather than from a fault run. */
export function hasStateChecks(mission: Pick<MissionDefinition, 'objectives'>): boolean {
  const kinds: readonly string[] = STATE_CHECK_KINDS
  return mission.objectives.some((objective) => kinds.includes(objective.check.kind))
}
