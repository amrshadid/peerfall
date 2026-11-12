import type { MissionPanels } from '@features/mission/types'
import { MISSION_STEPS } from '@features/mission/utils/layout'
import type { MissionPhase } from '@peerfall/game/types'

/** What tells where a player is in the mission loop: nothing they typed, only what was recorded. */
export interface MissionStepFacts {
  readonly phase: MissionPhase
  /** A run of the fault on the network as it was given is saved. */
  readonly hasBaseline: boolean
  /** A run after the baseline was judged. */
  readonly hasAttempt: boolean
  readonly completed: boolean
}

/**
 * The index of the current step in `MISSION_STEPS`; their count once the debrief is open.
 * Inspect lasts until the fault was watched once, Predict until a change was tried, Apply until
 * a run passes, Verify until the debrief is read.
 */
export function missionStepIndex({ phase, hasBaseline, hasAttempt, completed }: MissionStepFacts): number {
  if (phase === 'debrief') {
    return MISSION_STEPS.length
  }
  if (completed) {
    return 3
  }
  if (hasAttempt) {
    return 2
  }
  return hasBaseline ? 1 : 0
}

/**
 * The panels a step has opened. The incident is read beside the map alone; the timeline comes
 * with the network, and the editor once there is a baseline to improve on. A mission that breaks
 * nothing has no outage to time and no baseline to wait for: its editor opens with the network.
 */
export function panelsOfStep(phase: MissionPhase, stepIndex: number, hasFault = true): MissionPanels {
  const begun = phase !== 'incident'
  return {
    topology: true,
    timeline: begun && hasFault,
    editor: begun && (stepIndex > 0 || !hasFault),
  }
}
