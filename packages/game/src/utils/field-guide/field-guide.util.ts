import type { GameContent } from '#types/definitions/content'
import type { FieldGuideView } from '#types/definitions/field-guide'
import type { Progress } from '#types/definitions/progress'
import { findMissionProgress } from '#utils/progress/index'

/**
 * The Field Guide as the player has it: the entries whose mission has been started, in the
 * guide's order. It opens with the first of them.
 */
export function fieldGuideView(content: GameContent, progress: Progress): FieldGuideView {
  const entries = content.fieldGuide.entries.filter(
    (entry) => findMissionProgress(progress, entry.firstMet) !== undefined
  )
  return { open: entries.length > 0, entries }
}
