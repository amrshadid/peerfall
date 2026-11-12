import type { ChapterId } from '@peerfall/game/types'
import type { Tone } from './journey'

export interface GaugeStage {
  readonly id: ChapterId
  readonly stage: number
  readonly name: string
  /** "1/1"; "planned" for a stage without missions. */
  readonly count: string
  /** "Stage 4, Recover from failure, 0 of 1 passed". */
  readonly label: string
  readonly tone: Tone
  /** Fractions of the gauge's height. */
  readonly start: number
  readonly size: number
}

/** The map scroller's offset and height, in px. */
export interface ScrollFrame {
  readonly top: number
  readonly view: number
}

/** A stage's place in the drawing, top to bottom, in px. */
export interface StageSpan {
  readonly id: ChapterId
  readonly top: number
  readonly bottom: number
}

/** One stage's share of the gauge, as fractions of its height. */
export interface GaugeSegment {
  readonly id: ChapterId
  readonly start: number
  readonly size: number
}
