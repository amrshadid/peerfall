import type { GuideStepId } from '@features/guide/types'
import type { MissionPanels } from '@features/mission/types'

/**
 * The panels a step of the story has opened: absent, not greyed out, until the story needs them.
 * The scene is read beside the map alone; the timeline comes with See it, when the mission has an
 * outage to time; the editor with Build it, in the same missions. The others are played in vtysh,
 * and an editor open beside it showed configuration a later mission teaches; Settings can still
 * show every panel.
 */
/**
 * The done step before the one looked at, for Kernelfall's "Look at the previous step" key: from
 * the current step, the last done one; from a step looked back at, the one before it. Null at the
 * first step.
 */
export function previousStepOf<T extends string>(done: readonly T[], reviewing: T | null): T | null {
  const from = reviewing === null ? done.length : done.indexOf(reviewing)
  return from > 0 ? (done[from - 1] ?? null) : null
}

export function panelsOfStep(step: GuideStepId, hasFault = true): MissionPanels {
  const seen = step !== 'scene'
  return {
    topology: true,
    timeline: seen && hasFault,
    editor: seen && step !== 'see' && hasFault,
  }
}
