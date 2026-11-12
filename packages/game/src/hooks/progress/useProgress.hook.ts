import { useProgressStore } from '#store/progress.store'
import type { EpochMs, Progress } from '#types/definitions/progress'
import type { SaveIssue } from '#types/definitions/saves'
import type { GameStatus } from '#types/definitions/store'
import { GAME_STATUS } from '#types/definitions/store'

export interface UseProgressResult {
  readonly status: GameStatus
  readonly progress: Progress
  /** True only before the save has been loaded. Render nothing progress-dependent while it holds. */
  readonly isOpening: boolean
  readonly isOpen: boolean
  /** Writes queued or in flight. */
  readonly isSaving: boolean
  readonly lastSavedAt: EpochMs | null
  /** Why progress isn't reaching storage, or null when it is. */
  readonly saveIssue: SaveIssue | null
}

export function useProgress(): UseProgressResult {
  const status = useProgressStore((state) => state.status)
  const progress = useProgressStore((state) => state.progress)
  const pendingSaves = useProgressStore((state) => state.pendingSaves)
  const lastSavedAt = useProgressStore((state) => state.lastSavedAt)
  const saveIssue = useProgressStore((state) => state.saveIssue)

  return {
    status,
    progress,
    isOpening: status !== GAME_STATUS.open,
    isOpen: status === GAME_STATUS.open,
    isSaving: pendingSaves > 0,
    lastSavedAt,
    saveIssue,
  }
}
