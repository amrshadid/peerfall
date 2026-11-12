import type { SaveIssue } from '@peerfall/game/types'
import type { SaveState, StorageIssue } from '@shared/types'

/** The game knows the saves it couldn't read or write; only the page knows its storage is memory. */
export function storageIssueOf(saveIssue: SaveIssue | null, persistent: boolean): StorageIssue | null {
  if (saveIssue === 'unreadable') {
    return 'unreadable'
  }
  if (!persistent || saveIssue === 'no_storage') {
    return 'private'
  }
  return saveIssue === 'write_failed' ? 'full' : null
}

/** A storage issue outranks a save in flight. */
export function saveStateOf(saving: boolean, issue: StorageIssue | null): SaveState {
  if (issue === 'private' || issue === 'unreadable') {
    return 'memory'
  }
  if (issue === 'full') {
    return 'failed'
  }
  return saving ? 'saving' : 'saved'
}
