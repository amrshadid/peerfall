import type { StorageIssue } from '@shared/types'

export const STORAGE_OK_TEXT = 'Saved in this browser'

export const STORAGE_ISSUE_TEXT: Readonly<Record<StorageIssue, string>> = {
  private: 'Not saved: storage is off in this window',
  full: 'Not saved: storage refused the last save',
  unreadable: "Not saved: the stored game couldn't be read",
}
