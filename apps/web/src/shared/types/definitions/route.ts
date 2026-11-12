/** The Settings screen's sections, in the order they print: each has its own `#/settings/<section>`. */
export const SETTINGS_SECTIONS = ['display', 'gameplay', 'keyboard', 'saves', 'privacy', 'about'] as const

export type SettingsSectionId = (typeof SETTINGS_SECTIONS)[number]

export type Route =
  | { readonly name: 'title' }
  | { readonly name: 'map' }
  | { readonly name: 'mission'; readonly missionId: string }
  | { readonly name: 'settings'; readonly section: SettingsSectionId | null }
  /** `#/dev/workspace`: the mission workspace on fixtures. Served only where the app is configured for it. */
  | { readonly name: 'dev-workspace' }
  | { readonly name: 'not-found' }
