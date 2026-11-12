import type { MarkdownBlock } from '@features/guide/types'

/** One measured number of the run, e.g. "Recovery" / "0.90 s". */
export interface DebriefMeasure {
  readonly label: string
  readonly value: string
  /** `good` prints the value in the "passed" green, `bad` in red; the label and the verdict carry it in words. */
  readonly tone?: 'good' | 'bad'
}

/** A command to repeat the exercise with, on real FRR outside the game. */
export interface DebriefCommand {
  readonly command: string
  readonly explain: string
}

export interface DebriefPresentationProps {
  /** The mission's name. */
  title: string
  /** Whether the run met the mission's outcome, and that verdict in words, e.g. "Passed: traffic was back in 0.90 s". */
  verdict: { readonly passed: boolean; readonly text: string }
  measures: readonly DebriefMeasure[]
  /** Why it worked: one paragraph per entry. Text may set real terms in `code`, **strong** or _emphasis_. */
  explanation: readonly string[]
  /** The mission's own debrief as its file wrote it, with its headings and the commands to repeat; printed after the measurements. */
  text?: readonly MarkdownBlock[]
  /** The terms this mission taught, as the player met them. */
  learned: readonly string[]
  commands: readonly DebriefCommand[]
  /** Where the same network runs outside the game, e.g. a line about the lab; null for none. */
  labNote: string | null
  /** The mission after this one; null when there is none yet. */
  next: { readonly label: string; onSelect(): void } | null
  onReplay: () => void
  titleHref: string
}
