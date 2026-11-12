import type { EpochMs, Progress } from '#types/definitions/progress'

/** Marks a JSON document as a Peerfall save, so importing a random file fails clearly. */
export const SAVE_FORMAT = 'peerfall-save'

/** Each version up has its migration in SAVE_MIGRATIONS (utils/saves). */
export const SAVE_VERSION = 1

export const DEFAULT_SAVE_SLOT = 'main'

/**
 * Why progress isn't reaching storage: the stored save couldn't be read (`unreadable`: it is
 * kept untouched and this session plays without saving), the storage refused the last write
 * (`write_failed`), or the app has no storage to give (`no_storage`). In each case the game
 * plays on in memory and the app offers an export.
 */
export const SAVE_ISSUES = {
  unreadable: 'unreadable',
  writeFailed: 'write_failed',
  noStorage: 'no_storage',
} as const

export type SaveIssue = (typeof SAVE_ISSUES)[keyof typeof SAVE_ISSUES]

export type SaveSlot = string

/** Where an atomic write stages the new save, and where it keeps the last good one. */
export const NEXT_SUFFIX = '.next'
export const PREV_SUFFIX = '.prev'

/** How a queued write ended: when it was saved, or why it wasn't. */
export interface SaveOutcome {
  readonly savedAt: EpochMs | null
  readonly issue: SaveIssue | null
}

/** What is stored: JSON-safe and versioned so old saves can be migrated. */
export interface SaveFile {
  readonly format: typeof SAVE_FORMAT
  readonly version: number
  readonly savedAt: EpochMs
  readonly progress: Progress
}

/**
 * Upgrades a save from version `from` to `from + 1`. The caller stamps the new
 * version, so `migrate` only reshapes the data.
 */
export interface SaveMigration {
  readonly from: number
  migrate(save: Readonly<Record<string, unknown>>): Record<string, unknown>
}

/** The save version readSaveFile() upgrades to, and the migrations that get it there. */
export interface SaveSchema {
  readonly version: number
  readonly migrations: readonly SaveMigration[]
}

export interface LoadedSave {
  readonly progress: Progress
  readonly savedAt: EpochMs | null
  /** The version the save was migrated from, or `null` if it was current. */
  readonly migratedFrom: number | null
}
