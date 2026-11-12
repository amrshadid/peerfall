import { eventBus } from '@peerfall/core/services'
import { getGameConfig } from '#config'
import type { SavedPayload, SaveFailedPayload } from '#events/types'
import { GAME_EVENTS } from '#events/types'
import { queueSave, settleSaves } from '#services/utils/save-queue.service'
import { hasStorage } from '#services/utils/save-storage.service'
import { useProgressStore } from '#store/progress.store'
import { SAVE_ISSUES } from '#types/definitions/saves'
import { toSaveFile } from '#utils/saves/index'

const SOURCE = 'game/saves'

/**
 * Never overwrites a save the game couldn't read: the session plays on unsaved until an import
 * or reset. With no storage there is nothing to write to, and the store says so.
 */
export async function saveProgress(): Promise<void> {
  const store = useProgressStore.getState
  if (store().saveIssue === SAVE_ISSUES.unreadable) {
    return settleSaves()
  }
  if (!hasStorage()) {
    store().saveSkipped(SAVE_ISSUES.noStorage)
    return settleSaves()
  }
  const { clock, slot } = getGameConfig()
  const file = toSaveFile(store().progress, clock.now())
  store().saveStarted()
  const outcome = await queueSave(slot, file)
  store().saveFinished(outcome.savedAt, outcome.issue)
  if (outcome.issue === null) {
    eventBus.emit<SavedPayload>(GAME_EVENTS.SAVED, { at: file.savedAt }, { source: SOURCE })
  } else {
    eventBus.emit<SaveFailedPayload>(
      GAME_EVENTS.SAVE_FAILED,
      { issue: outcome.issue, at: file.savedAt },
      { source: SOURCE }
    )
  }
}
