import type { GuideStepId } from '@features/guide/types'
import type { MissionPanels } from '@features/mission/types'

/**
 * The panels a step of the story has opened: absent, not greyed out, until the story needs them.
 * The scene is read beside the map alone; the timeline comes with See it, when the mission has an
 * outage to time; the editor with Build it, in the same missions. The others are played in vtysh,
 * and an editor open beside it showed configuration a later mission teaches; Settings can still
 * show every panel.
 */
export function panelsOfStep(step: GuideStepId, hasFault = true): MissionPanels {
  const seen = step !== 'scene'
  return {
    topology: true,
    timeline: seen && hasFault,
    editor: seen && step !== 'see' && hasFault,
  }
}
