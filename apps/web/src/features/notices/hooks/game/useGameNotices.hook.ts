import { useNotices } from '@app/store'
import { codexFiledNotice, missionPassedNotice, saveFailedNotice } from '@features/notices/utils/notices'
import { useEventListener } from '@peerfall/core/hooks'
import { GAME_EVENTS, type MissionCompletedPayload, type SaveFailedPayload } from '@peerfall/game'
import type { MissionId } from '@peerfall/game/types'

/**
 * Puts the game's own news on the status line: a mission passed for the first time and the Codex
 * cards it filed, a save that failed.
 */
export function useGameNotices(
  titleOf: (missionId: MissionId) => string,
  cardsOf: (missionId: MissionId) => readonly string[] = () => []
): void {
  const { showNotice } = useNotices()

  useEventListener<MissionCompletedPayload>(GAME_EVENTS.MISSION_COMPLETED, ({ payload }) => {
    showNotice(missionPassedNotice(payload.missionId, titleOf(payload.missionId), payload.at))
    const filed = codexFiledNotice(payload.missionId, cardsOf(payload.missionId), payload.at)
    if (filed) {
      showNotice(filed)
    }
  })
  useEventListener<SaveFailedPayload>(GAME_EVENTS.SAVE_FAILED, ({ payload }) =>
    showNotice(saveFailedNotice(payload.at))
  )
}
