import type { ReactNode } from 'react'

export type ButtonVariant = 'default' | 'primary' | 'quiet'

/** `lg` is the title screen's Start; `sm` fits dense bars. */
export type ButtonSize = 'sm' | 'md' | 'lg'

export type StepState = 'done' | 'current' | 'future'

/** How much of the step rail is labelled: every step, only the current one, or none (squares only). */
export type RailMode = 'full' | 'current' | 'marks'

export interface RailStep {
  readonly id: string
  readonly label: string
}

export interface TitleBlockEntry {
  readonly label: string
  readonly value: ReactNode
  /** `good` prints the value in the "passed" green, e.g. a recovery inside its target. */
  readonly tone?: 'good' | 'bad'
}

export interface ContentsEntry {
  readonly id: string
  readonly name: string
  /** The page reference after the leader dots, e.g. "1 mission". */
  readonly reference: ReactNode
  /** A link target, or `onSelect` for an action. With neither, the entry is plain text: not built yet. */
  readonly href?: string
  readonly onSelect?: () => void
}
