import { DEFAULT_GAME_CONFIG, type GameConfig } from '#types/definitions/config'

let _config: GameConfig = DEFAULT_GAME_CONFIG

/** Once at app startup. Options left out keep their defaults. */
export function configureGame(config: Partial<GameConfig> = {}): void {
  _config = { ...DEFAULT_GAME_CONFIG, ...config }
}

export function getGameConfig(): GameConfig {
  return _config
}

export function resetGameConfig(): void {
  _config = DEFAULT_GAME_CONFIG
}
