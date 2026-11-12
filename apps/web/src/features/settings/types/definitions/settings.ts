import type { ClarityConsent, MotionSetting, ThemeSetting } from '@shared/types'

/** The rest are kept by the screens that use them. */
export interface SettingsValues {
  readonly theme: ThemeSetting
  readonly motion: MotionSetting
  readonly uiScale: number
  readonly showAllPanels: boolean
  readonly clarityConsent: ClarityConsent
}

export interface ImportPreview {
  /** "3 missions passed, saved 12 Oct", or the reason the file was refused. */
  readonly summary: string
  readonly valid: boolean
}
