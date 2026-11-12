import { eventBus } from '@peerfall/core/services'
import { getGameNow } from '#config'
import type { ProgressChangedPayload } from '#events/types'
import { GAME_EVENTS } from '#events/types'
import { settleSaves } from '#services/utils/save-queue.service'

/** Announces a change worth keeping; autosave writes it, and this resolves once it has landed. */
export function announceProgress(source: string): Promise<void> {
  eventBus.emit<ProgressChangedPayload>(GAME_EVENTS.PROGRESS_CHANGED, { at: getGameNow() }, { source })
  return settleSaves()
}
