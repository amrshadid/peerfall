import { useEventListener } from '@peerfall/core/hooks'
import type { SaveFailedPayload } from '#events/types'
import { GAME_EVENTS } from '#events/types'

/** Each save that couldn't reach storage; the progress stays in memory. */
export function useSaveFailed(handler: (failure: SaveFailedPayload) => void): void {
  useEventListener<SaveFailedPayload>(GAME_EVENTS.SAVE_FAILED, (event) => handler(event.payload))
}
