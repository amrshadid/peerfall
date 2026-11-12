import { DEFAULT_UI_SCALE } from '#spacing/spacing.constants'
import type { PrintName } from '#types/definitions/palette'

export interface ThemeConfig {
  /** The print used when the player hasn't chosen one and the system has no preference. */
  readonly defaultPrint: PrintName
  /** The UI scale before the player changes it in Settings. */
  readonly defaultUiScale: number
}

export const DEFAULT_THEME_CONFIG: ThemeConfig = { defaultPrint: 'day', defaultUiScale: DEFAULT_UI_SCALE }
