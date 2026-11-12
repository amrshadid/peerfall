import type { StorageAdapter } from '@peerfall/core/types'

export interface GameConfig {
  /** Where saves go; `null` keeps the game playable in memory only. */
  readonly storage: StorageAdapter | null
}

export const DEFAULT_GAME_CONFIG: GameConfig = { storage: null }
