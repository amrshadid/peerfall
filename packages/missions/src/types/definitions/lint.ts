import type { MissionId } from '@peerfall/game/types'

/** The words of one guided step against its budget. */
export interface StepWords {
  readonly section: string
  readonly words: number
  readonly budget: number
}

export interface CardWords {
  readonly cardId: string
  readonly simple: number
  readonly deep: number
}

/** A word the story uses with one meaning only, so a player never has to unlearn it. */
export interface VocabularyRule {
  readonly word: string
  readonly means: string
  readonly pattern: RegExp
  /** The only ways to write it; anything else is flagged. */
  readonly allowed?: RegExp
  /** Mission ids that may use it freely. */
  readonly only?: readonly MissionId[]
}

export interface BannedUse {
  readonly phrase: string
  readonly section: string
}

/** One mission measured against the content budgets. */
export interface MissionLint {
  readonly missionId: MissionId
  /** How many concepts it teaches. */
  readonly concepts: number
  readonly steps: readonly StepWords[]
  readonly storyWords: number
  readonly asides: number
  readonly banned: readonly BannedUse[]
  readonly cards: readonly CardWords[]
  /** Each budget it breaks, in words. */
  readonly problems: readonly string[]
}
