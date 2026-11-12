import { eventBus } from '@peerfall/core/services'
import { getGameConfig } from '#config'
import { GAME_EVENTS } from '#events/types'
import { saveProgress } from '#services/utils/save-progress.service'

// Autosave: hooks wait for the queued write, so a change is stored before the flow that made it resolves.
function handleProgressChanged() {
  if (getGameConfig().autosave) {
    void saveProgress()
  }
}

export function setupGameListeners() {
  eventBus.on(GAME_EVENTS.PROGRESS_CHANGED, handleProgressChanged)
}

export function cleanupGameListeners() {
  eventBus.off(GAME_EVENTS.PROGRESS_CHANGED, handleProgressChanged)
}
