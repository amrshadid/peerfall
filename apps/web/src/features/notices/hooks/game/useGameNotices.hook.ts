import { useNotices } from '@app/store'
import { missionPassedNotice, saveFailedNotice } from '@features/notices/utils/notices'
import { useEventListener } from '@peerfall/core/hooks'
import { GAME_EVENTS, type MissionCompletedPayload, type SaveFailedPayload } from '@peerfall/game'
import type { MissionId } from '@peerfall/game/types'

/** Puts the game's own news on the status line: a mission passed for the first time, a save that failed. */
export function useGameNotices(titleOf: (missionId: MissionId) => string): void {
  const { showNotice } = useNotices()

  useEventListener<MissionCompletedPayload>(GAME_EVENTS.MISSION_COMPLETED, ({ payload }) =>
    showNotice(missionPassedNotice(payload.missionId, titleOf(payload.missionId), payload.at))
  )
  useEventListener<SaveFailedPayload>(GAME_EVENTS.SAVE_FAILED, ({ payload }) =>
    showNotice(saveFailedNotice(payload.at))
  )
}
