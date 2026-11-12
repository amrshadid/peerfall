import { DEFAULT_GAME_CONFIG, type GameConfig } from '#types/definitions/config'
import type { EpochMs } from '#types/definitions/progress'

let _config: GameConfig = DEFAULT_GAME_CONFIG

/** Once at app startup. Options left out keep their defaults. */
export function configureGame(config: Partial<GameConfig> = {}): void {
  _config = { ...DEFAULT_GAME_CONFIG, ...config }
}

export function getGameConfig(): GameConfig {
  return _config
}

/** Timestamps come from the configured clock, so tests control them. */
export function getGameNow(): EpochMs {
  return _config.clock.now()
}

export function resetGameConfig(): void {
  _config = DEFAULT_GAME_CONFIG
}
