import type { StorageAdapter } from '@peerfall/core/types'
import type { GameContent } from '#types/definitions/content'
import type { EpochMs } from '#types/definitions/progress'
import { DEFAULT_SAVE_SLOT, type SaveSlot } from '#types/definitions/saves'

/** Where timestamps come from, so tests control them. */
export interface WallClock {
  now(): EpochMs
}

export interface GameConfig {
  /** Where saves go; `null` keeps the game playable in memory only. */
  readonly storage: StorageAdapter | null
  /** The validated chapters and missions; `null` until the app has loaded them. */
  readonly content: GameContent | null
  readonly clock: WallClock
  readonly slot: SaveSlot
  /** Save after every change that matters (mission events, imports). Off only in tests. */
  readonly autosave: boolean
}

export const DEFAULT_GAME_CONFIG: GameConfig = {
  storage: null,
  content: null,
  clock: { now: () => Date.now() },
  slot: DEFAULT_SAVE_SLOT,
  autosave: true,
}
