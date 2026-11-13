/** The Settings screen's sections, in the order they print: each has its own `#/settings/<section>`. */
export const SETTINGS_SECTIONS = ['display', 'gameplay', 'keyboard', 'saves', 'privacy', 'about'] as const

export type SettingsSectionId = (typeof SETTINGS_SECTIONS)[number]

/** The Codex's pages besides the cards, each with its own `#/codex/<page>`. */
export const CODEX_PAGES = ['field-guide', 'glossary'] as const

export type CodexPageId = (typeof CODEX_PAGES)[number]

export type Route =
  | { readonly name: 'title' }
  | { readonly name: 'map' }
  /** `card`: a Codex card open over the mission, so reading it never leaves the mission. */
  | { readonly name: 'mission'; readonly missionId: string; readonly card?: string }
  /** `#/codex`, `#/codex/<cardId>`: the Codex, open at a card; `chapter` opens a chapter's title page. */
  | {
      readonly name: 'codex'
      readonly cardId: string | null
      readonly chapter?: string
      readonly page?: CodexPageId
    }
  | { readonly name: 'settings'; readonly section: SettingsSectionId | null }
  /** `#/dev/workspace`: the mission workspace on fixtures. Served only where the app is configured for it. */
  | { readonly name: 'dev-workspace' }
  | { readonly name: 'not-found' }
