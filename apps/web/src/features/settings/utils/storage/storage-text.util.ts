import type { StorageIssue } from '@shared/types'
import { STORAGE_ISSUE_TEXT, STORAGE_OK_TEXT } from './storage-text.constants'

/** The Saves section's aside: where saves go, or why they don't. */
export function storageTextOf(issue: StorageIssue | null): string {
  return issue ? STORAGE_ISSUE_TEXT[issue] : STORAGE_OK_TEXT
}
