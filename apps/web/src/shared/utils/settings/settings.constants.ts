import type { ClarityConsent, MotionSetting, PanelId, Settings, ThemeSetting } from '@shared/types'

/** The version of the stored settings; a change of shape gets a new number and a line in `migrateSettings`. */
export const SETTINGS_VERSION = 1

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  motion: 'system',
  uiScale: 1,
  showAllPanels: false,
  toursSeen: [],
  panelSizes: { guide: null, network: null, editor: null },
  clarityConsent: 'unset',
}

/** How far each divider may go: a panel never gets too small to read or crowds out the rest. */
export const PANEL_LIMITS: Readonly<Record<PanelId, { readonly min: number; readonly max: number }>> = {
  guide: { min: 15, max: 34 },
  network: { min: 19, max: 44 },
  editor: { min: 25, max: 80 },
}

/** More ids than any tour has stops; a longer stored list is not ours. */
export const MAX_TOURS_SEEN = 64
/** Longer than any tour stop id (`mission:terminal`); a longer stored id is not ours. */
export const MAX_TOUR_ID_LENGTH = 64

export const UI_SCALES = [0.875, 1, 1.125, 1.25, 1.5] as const

export const THEMES: readonly ThemeSetting[] = ['system', 'light', 'dark']
export const MOTIONS: readonly MotionSetting[] = ['system', 'reduce']
export const CLARITY_CONSENTS: readonly ClarityConsent[] = ['unset', 'granted', 'denied']
