import { useEventListener } from '@peerfall/core/hooks'
import type { MissionCompletedPayload } from '#events/types'
import { GAME_EVENTS } from '#events/types'

/** Each mission the player passes for the first time, with the attempts and hints it took. */
export function useMissionCompleted(handler: (completion: MissionCompletedPayload) => void): void {
  useEventListener<MissionCompletedPayload>(GAME_EVENTS.MISSION_COMPLETED, (event) => handler(event.payload))
}
