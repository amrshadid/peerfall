/** `system` follows the operating system's light or dark setting. */
export type ThemeSetting = 'system' | 'light' | 'dark'

/** `reduce` turns motion off even when the system allows it. */
export type MotionSetting = 'system' | 'reduce'

/** The screens with a guided tour. */
export type TourScreen = 'title' | 'map' | 'mission'

/** The mission screen's resizable panels. */
export type PanelId = 'guide' | 'network' | 'editor'

/**
 * What the player dragged each divider to: the Guide's and the network dock's widths in rem (so they
 * follow the text size), the editor's share of the workspace in percent. Null keeps the screen's own default.
 */
export type PanelSizes = Readonly<Record<PanelId, number | null>>

export interface Settings {
  readonly theme: ThemeSetting
  readonly motion: MotionSetting
  /** Multiplies the root font size; every size in the UI is in rem. */
  readonly uiScale: number
  /** Instead of unlocking panels with the mission. */
  readonly showAllPanels: boolean
  /** Tour stop ids like `mission:terminal`. */
  readonly toursSeen: readonly string[]
  readonly panelSizes: PanelSizes
  /** Microsoft Clarity loads only when `granted`; `unset` shows the consent notice. */
  readonly clarityConsent: ClarityConsent
}

/** The player's answer to the recording notice; `unset` until they choose. */
export type ClarityConsent = 'unset' | 'granted' | 'denied'
