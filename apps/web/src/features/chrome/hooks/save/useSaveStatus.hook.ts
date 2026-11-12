import { saveStateOf, storageIssueOf } from '@features/chrome/utils/save'
import { useProgress } from '@peerfall/game/hooks'
import type { SaveState, StorageIssue } from '@shared/types'
import { pageStorage } from '@shared/utils/storage'

export interface UseSaveStatusResult {
  readonly saveState: SaveState
  readonly lastSavedAt: number | null
  readonly storageIssue: StorageIssue | null
}

export function useSaveStatus(): UseSaveStatusResult {
  const { isSaving, lastSavedAt, saveIssue } = useProgress()
  const storageIssue = storageIssueOf(saveIssue, pageStorage().persistent)
  return { saveState: saveStateOf(isSaving, storageIssue), lastSavedAt, storageIssue }
}
