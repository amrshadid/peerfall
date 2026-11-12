import type { ButtonVariant } from '@shared/types'

/** The incident report the mission opens with. Text may set real terms in `code`, **strong** or _emphasis_. */
export interface GuideIncident {
  readonly title: string
  /** Who reported it and when, as the report's own line, e.g. "Reported by the on-call engineer"; null for none. */
  readonly source: string | null
  /** One paragraph per entry. */
  readonly body: readonly string[]
}

export interface GuideObjective {
  readonly id: string
  readonly text: string
  /** Judged by what the network did, never by which command was typed. */
  readonly passed: boolean
  /** What the last run showed instead, when the check could say; shown under an open objective. */
  readonly observed?: string | null
}

/** A revealed hint. They come in stages: where to look first, a specific command last. */
export interface GuideHint {
  /** The stage in words, e.g. "where to look". */
  readonly stage: string
  readonly text: string
}

export interface GuideHints {
  /** The hints asked for so far, in the order they were revealed. */
  readonly revealed: readonly GuideHint[]
  /** How many are still to ask for. */
  readonly left: number
  /** Reveals the next one; null when there is none to reveal or hints are off for this step. */
  readonly onReveal: (() => void) | null
}

/** A command the step suggests, with what it shows. */
export interface GuideCommand {
  readonly command: string
  readonly explain: string
  /** Types the command into the terminal on a click; null to only name it. */
  readonly onRun: (() => void) | null
}

export interface GuideAction {
  readonly id: string
  readonly label: string
  readonly kind: ButtonVariant
  /** Shortcut shown on the button, as the player's OS prints it ("⌥N", "Alt+N"). */
  readonly keys?: string
  onSelect(): void
}

export interface GuidePresentationProps {
  /** The step of the mission on show, e.g. "Inspect". */
  stepLabel: string
  incident: GuideIncident
  /** What to do in this step: one idea, one paragraph per entry. */
  task: readonly string[]
  objectives: readonly GuideObjective[]
  commands: readonly GuideCommand[]
  hints: GuideHints
  /** A quiet line under everything else, e.g. "Nothing is timed. Retry as often as you like."; null for none. */
  note: string | null
  /** The way on, kept in view under the scrolling text. */
  actions: readonly GuideAction[]
}
