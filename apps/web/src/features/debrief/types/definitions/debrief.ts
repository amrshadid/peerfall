import type { CodexCardData } from '@shared/types'

/** One measured number of the run, e.g. "Recovery" / "0.90 s". */
export interface DebriefMeasure {
  readonly label: string
  readonly value: string
  /** `good` prints the value in the "passed" green, `bad` in red; the label and the verdict carry it in words. */
  readonly tone?: 'good' | 'bad'
}

/** The stage this mission finished, with what the player can now do: Kernelfall's region block. */
export interface DebriefStage {
  /** "Stage 1 · First router". */
  readonly name: string
  readonly outcomes: readonly string[]
}

export interface DebriefPresentationProps {
  /** The debrief's first sentence, as Kernelfall's card opens with it. Text may set terms in `code`. */
  headline: string
  /** The result in one line, e.g. "Mission complete · 2 of 2 objectives met". */
  result: string
  measures: readonly DebriefMeasure[]
  /** The terms this mission taught, as the player met them. */
  learned: readonly string[]
  /** The Codex cards this mission filed, printed whole as Kernelfall's card prints them. */
  cards: readonly CodexCardData[]
  /** "The Dark Cable": the mission the cards were filed in, for their stamp. */
  seenIn: string
  /** Set on the mission that finished its stage; null on the others. */
  stage: DebriefStage | null
  /** The mission after this one; null when there is none yet. */
  next: { readonly label: string; onSelect(): void } | null
  onReplay: () => void
  mapHref: string
}
