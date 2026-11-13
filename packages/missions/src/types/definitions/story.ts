/**
 * One beat of a story section: a spoken (or narrated) line, a code sample, or a pause (`---`):
 * what follows waits until the player has done what the text before it asked. A line followed by
 * a list with one `[x]` is a question the player answers first (`predict`); `[x]` marks what
 * really happens.
 */
export type StoryBlock =
  | { readonly kind: 'line'; readonly speaker: string | null; readonly text: string }
  | { readonly kind: 'code'; readonly text: string }
  | { readonly kind: 'pause' }
  | {
      readonly kind: 'predict'
      readonly speaker: string | null
      readonly text: string
      readonly options: readonly StoryOption[]
    }

export interface StoryOption {
  readonly text: string
  readonly right: boolean
}

/** The beats of a section up to a pause: what the Guide shows at once. */
export type StoryStep = readonly StoryBlock[]

/** A mission's `story.md`. */
export interface Story {
  /** The `# Title` line. */
  readonly title: string
  /** The `**Question:**` line under the title: what the mission answers. */
  readonly question: string | null
  /** By section slug (`scene`, `see-it`, `debrief`, `real-world`…), in the file's order. */
  readonly sections: ReadonlyMap<string, readonly StoryBlock[]>
}

/** Something in a story.md that the Guide could not show as written, with its line from 1. */
export interface StoryProblem {
  readonly line: number
  readonly message: string
}
