import type { GuideHint, GuideStatus } from '@features/guide/types'
import type { ProbeNames } from '@features/guide/utils/objectives'
import type { ObjectiveHints } from '@peerfall/game/hooks'
import type { MissionDefinition, MissionVerdict } from '@peerfall/game/types'
import type { MissionRunPhase } from '@peerfall/missions/hooks'

/** The mission loop's steps, as docs/MISSIONS.md names them. */
export type GuideStep = 'inspect' | 'predict' | 'apply' | 'verify'

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
  mission: Pick<MissionDefinition, 'fault' | 'probe' | 'network'>,
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
        text: `The link ${linkText(mission)} is dropping every packet and the outage is being measured. This takes about 4 to 6 seconds when BFD runs on both ends of the link, and up to about a minute without it. The network then goes back to how you had configured it; what you change during the run is not kept.`,
        busy: true,
        failed: false,
        details: [],
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
    case 'failed':
      return 'The network could not be started.'
    case 'ready':
      return null
  }
}

/** What to do in each step of the loop, with this mission's own names in it. */
export function taskOf(
  step: GuideStep,
  mission: Pick<MissionDefinition, 'fault'>,
  names: ProbeNames
): readonly string[] {
  const link = linkText(mission)
  // A mission that breaks nothing has no baseline to take: its objectives are the whole task.
  if (!mission.fault) {
    return [
      'Select a router on the map to put the terminal in it, then work through the objectives below. Each is judged by what the routers do, never by what you typed.',
    ]
  }
  switch (step) {
    case 'inspect':
      return [
        `Select a router on the map to put the terminal in it. **Send probe** sends packets from ${names.from} to ${names.target} for a few seconds and shows whether replies come back and which way they go.`,
        `**Break the link** makes the link ${link} drop every packet while its interfaces stay up, and measures how long traffic is lost. Run it once before you change anything: that run is your baseline.`,
      ]
    case 'predict':
      return [
        'You have a baseline. The timeline shows what noticed the dead link and how long each step took.',
        'Before you change anything, say what you expect: which moment on the timeline has to come sooner? Then change the routers, in `vtysh` in the terminal or in the editor, and break the link again.',
      ]
    case 'apply':
      return [
        'The last run did not meet every objective. Compare its timeline with the baseline, change the configuration, and break the link again. Retries are free.',
      ]
    case 'verify':
      return [
        'The last run met every objective. Compare the two runs on the timeline, then read the debrief for why it worked. You can keep experimenting.',
      ]
  }
}

/** The objective a hint is for now: the first one still open with a hint left, else any with one left. */
export function hintTargetOf(objectives: readonly ObjectiveHints[], verdict: MissionVerdict | null): string | null {
  const withHints = objectives.filter((entry) => entry.left > 0)
  const passed = (id: string) => verdict?.objectives.find((judged) => judged.objectiveId === id)?.result.passed ?? false
  return (withHints.find((entry) => !passed(entry.objective.id)) ?? withHints[0])?.objective.id ?? null
}

/** Every hint shown so far, objective by objective, each saying which objective and which stage it is. */
export function revealedHintsOf(objectives: readonly ObjectiveHints[]): readonly GuideHint[] {
  return objectives.flatMap((entry, objectiveIndex) => {
    const total = entry.revealed.length + entry.left
    return entry.revealed.map((hint, index) => ({
      stage: `objective ${objectiveIndex + 1}, step ${index + 1} of ${total}`,
      text: hint.text,
      command: hint.command ?? null,
    }))
  })
}

export function hintsLeftOf(objectives: readonly ObjectiveHints[]): number {
  return objectives.reduce((sum, entry) => sum + entry.left, 0)
}
