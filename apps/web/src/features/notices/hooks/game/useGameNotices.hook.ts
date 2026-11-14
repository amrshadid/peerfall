import { useNotices } from '@app/store'
import { codexFiledNotice, missionPassedNotice, saveFailedNotice } from '@features/notices/utils/notices'
import { useMissionCompleted, useSaveFailed } from '@peerfall/game/hooks'
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

  useMissionCompleted(({ missionId, at }) => {
    showNotice(missionPassedNotice(missionId, titleOf(missionId), at))
    const filed = codexFiledNotice(missionId, cardsOf(missionId), at)
    if (filed) {
      showNotice(filed)
    }
  })
  useSaveFailed(({ at }) => showNotice(saveFailedNotice(at)))
}
