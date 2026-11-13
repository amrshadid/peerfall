import type { CodexCardData } from '@shared/types'

/** `filed`: from a completed mission; `seen`: met in a mission still in progress; `blank`: not found yet. */
export type CodexEntryState = 'filed' | 'seen' | 'blank'

/** A card's place in a chapter: a link once found, a blank outline with its mission number before. */
export interface CodexEntry {
  readonly key: string
  readonly state: CodexEntryState
  /** Null for a blank outline: nothing is spoiled. */
  readonly term: string | null
  readonly href: string | null
  /** `1.2`. */
  readonly missionNumber: string
  /** The card on the page. */
  readonly current: boolean
}

/** One stage's cards in teaching order, as the Codex's index lists them. */
export interface CodexIndexChapter {
  readonly id: string
  /** "Stage 1 · First router". */
  readonly heading: string
  /** Its title page. */
  readonly href: string
  /** "3 / 7 filed". */
  readonly count: string
  readonly entries: readonly CodexEntry[]
  /** Its title page is on show. */
  readonly current: boolean
}

/** A chapter's title page: the stage's story, its guide, the real part of FRR, its cards and, once finished, what the player can now do. */
export interface CodexTitlePage {
  readonly id: string
  /** "Stage 1". */
  readonly kicker: string
  readonly title: string
  readonly story: string | null
  /** The daemon who guides the stage, with what it really is. */
  readonly guide: { readonly name: string; readonly term: string } | null
  readonly standsFor: string | null
  readonly count: string
  readonly entries: readonly CodexEntry[]
  /** Empty until every mission of the stage is completed. */
  readonly youCanNow: readonly string[]
}

/** What the Codex's cards page shows: a card, a chapter's title page, or nothing found yet. */
export type CodexPage =
  | { readonly kind: 'card'; readonly card: CodexCardData; readonly filed: boolean }
  | { readonly kind: 'chapter'; readonly chapter: CodexTitlePage }
  | { readonly kind: 'empty' }

export interface FieldGuideRow {
  /** As the player types it. */
  readonly name: string
  /** "vtysh" or "shell": where it is typed. */
  readonly where: string
  readonly what: string
  /** "1.3 The Silent Router". */
  readonly firstMet: string
  readonly deepenedIn: readonly string[]
}

export interface GlossaryRow {
  readonly term: string
  readonly simple: string
  readonly href: string
  readonly missionNumber: string
}

export type CodexTab = 'cards' | 'field-guide' | 'glossary'
