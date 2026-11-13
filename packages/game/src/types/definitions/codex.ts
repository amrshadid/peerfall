import type { ChapterDefinition, CodexCard, MissionId } from '#types/definitions/mission'

/**
 * How far the player has got with a card: filed (its mission completed), seen (its mission
 * started) or hidden (a blank outline with its mission's number, so nothing is spoiled).
 */
export type CodexCardState = 'filed' | 'seen' | 'hidden'

/** A card with the mission that first adds it. */
export interface CodexEntry {
  readonly card: CodexCard
  readonly missionId: MissionId
  /** `1.2`: the stage, then the mission's place in it. */
  readonly missionNumber: string
}

/** Another card of the same `deepens` chain, to link to. */
export interface CodexCardLink {
  readonly cardId: string
  readonly term: string
  readonly missionNumber: string
  readonly state: CodexCardState
}

export interface CodexChapterCard extends CodexEntry {
  readonly state: CodexCardState
  /** The earlier card this one adds to, if any. */
  readonly deepens: CodexCardLink | null
  /** The later cards that add to this one, in play order. */
  readonly deepenedBy: readonly CodexCardLink[]
}

/** One stage's cards, in teaching order: a chapter of the Codex, with its title page. */
export interface CodexChapter {
  readonly chapter: ChapterDefinition
  readonly cards: readonly CodexChapterCard[]
  readonly filed: number
  readonly total: number
  /** True once every mission of the stage is completed. */
  readonly finished: boolean
  /** The chapter's "You can now…" lines once it is finished; empty before. */
  readonly youCanNow: readonly string[]
}

/** A word of the glossary, from a card the player has found. */
export interface GlossaryEntry {
  readonly term: string
  readonly simple: string
  readonly cardId: string
  readonly missionNumber: string
}

/** The whole Codex as the player has it. */
export interface CodexView {
  /** One per stage that adds cards, in play order. */
  readonly chapters: readonly CodexChapter[]
  /** The terms of every card found so far, filed or seen, in alphabetical order. */
  readonly glossary: readonly GlossaryEntry[]
  readonly filed: number
  readonly total: number
}
