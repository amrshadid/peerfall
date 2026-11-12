import type { ThemeConfig } from '#types/definitions/config'
import { DEFAULT_THEME_CONFIG } from '#types/definitions/config'

let _config: ThemeConfig = DEFAULT_THEME_CONFIG

/** Once at app startup. Options left out keep the Section 2 defaults. */
export function configureTheme(config: Partial<ThemeConfig> = {}): void {
  _config = { ...DEFAULT_THEME_CONFIG, ...config }
}

export function getThemeConfig(): ThemeConfig {
  return _config
}

export function resetThemeConfig(): void {
  _config = DEFAULT_THEME_CONFIG
}
