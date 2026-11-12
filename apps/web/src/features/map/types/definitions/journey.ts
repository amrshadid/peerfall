import type { ChapterDefinition, ChapterId, MissionDefinition, MissionEntry, MissionId } from '@peerfall/game/types'

/** The shape a stop is drawn in; `progress` is a mission under way. */
export type StopState = 'locked' | 'available' | 'progress' | 'done'

/** How far a stage is: every mission passed, some open, none open yet, or no missions written. */
export type Tone = 'passed' | 'progress' | 'ahead' | 'planned'

/** What the map reads of a mission; a `MissionDefinition` is one. */
export type JourneyMissionSource = Pick<
  MissionDefinition,
  'id' | 'title' | 'objective' | 'prerequisites' | 'recoveryTargetMs'
>

/** What the map reads of the mission list; a `ChapterEntry` is one. */
export interface JourneyChapterSource {
  readonly chapter: ChapterDefinition
  readonly missions: readonly (Pick<MissionEntry, 'status' | 'attempts' | 'hintsUsed'> & {
    readonly mission: JourneyMissionSource
  })[]
}

/** A mission that must be completed before another opens. */
export interface JourneyNeed {
  readonly id: MissionId
  readonly title: string
  readonly met: boolean
}

/** One mission: a stop on the road. */
export interface JourneyStop {
  /** The mission's id: unique across the map. */
  readonly key: MissionId
  /** Its stage and its place in it: "4.1". */
  readonly number: string
  readonly title: string
  readonly chapterId: ChapterId
  readonly stage: number
  readonly state: StopState
  /** Spoken and printed status, e.g. "in progress, you are here". */
  readonly status: string
  readonly playable: boolean
  /** Where Continue goes. */
  readonly here: boolean
  /** The whole mission in one sentence. */
  readonly summary: string
  readonly needs: readonly JourneyNeed[]
  readonly attempts: number
  readonly hintsUsed: number
  readonly recoveryTargetMs: number
}

/** One stage of the journey with its missions in play order. */
export interface JourneyChapter {
  readonly id: ChapterId
  readonly stage: number
  /** "Stage 4 of 11". */
  readonly kicker: string
  readonly name: string
  /** One sentence: what the stage covers. */
  readonly caption: string
  readonly stops: readonly JourneyStop[]
  readonly done: number
  readonly total: number
  readonly tone: Tone
  /** "1 of 1 passed"; "Planned: no missions yet" for a stage without missions. */
  readonly progress: string
  /** No missions written yet: drawn in pencil. */
  readonly planned: boolean
  /** One sentence for screen readers. */
  readonly summary: string
  readonly hasHere: boolean
}
