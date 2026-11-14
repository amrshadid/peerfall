import type {
  ChapterDefinition,
  ChapterId,
  MissionDefinition,
  MissionEntry,
  MissionId,
  SkillId,
} from '@peerfall/game/types'

/**
 * The shape a stop is drawn in; `progress` is a mission under way. A completed mission is `clean`
 * when it passed on its first judged run with no hint, `helped` when hints were used, else `done`.
 */
export type StopState = 'locked' | 'available' | 'progress' | 'done' | 'clean' | 'helped'

/** What the map's stops are named by: their mission, or the first skill it earns. */
export type MapView = 'missions' | 'skills'

/** How far a stage is: every mission passed, some open, none open yet, or no missions written. */
export type Tone = 'passed' | 'progress' | 'ahead' | 'planned'

/** What the map reads of a mission; a `MissionDefinition` is one. */
export type JourneyMissionSource = Pick<
  MissionDefinition,
  'id' | 'title' | 'objective' | 'skills' | 'prerequisites' | 'recoveryTargetMs' | 'minutes' | 'codex'
>

/** What the map reads of the mission list; a `ChapterEntry` is one. */
export interface JourneyChapterSource {
  readonly chapter: ChapterDefinition
  readonly missions: readonly (Pick<MissionEntry, 'status' | 'attempts' | 'hintsUsed'> & {
    readonly mission: JourneyMissionSource
  })[]
}

/** A skill as the map names it: its id, and its title from `skills.yaml`. */
export interface JourneySkill {
  readonly id: SkillId
  readonly title: string
}

/** A skill a mission needs: whether a completed mission has earned it, and which mission earns it. */
export interface JourneyNeed extends JourneySkill {
  readonly met: boolean
  /** The title of the mission that earns it; null when no mission on the map does. */
  readonly earnedIn: string | null
}

/** One mission: a stop on the road. A stage with no missions yet has one planned stop in their place. */
export interface JourneyStop {
  /** The mission's id, or `planned:<chapter id>`: unique across the map. */
  readonly key: MissionId
  /** Stands for missions that are not built yet: pencilled, never playable. */
  readonly planned: boolean
  /** Its stage and its place in it: "4.1". */
  readonly number: string
  readonly title: string
  readonly chapterId: ChapterId
  readonly stage: number
  /** The region it is drawn under; null for a planned stop. */
  readonly regionId: string | null
  readonly state: StopState
  /** Spoken and printed status, e.g. "in progress, you are here". */
  readonly status: string
  readonly playable: boolean
  /** Where Continue goes. */
  readonly here: boolean
  /** The whole mission in one sentence. */
  readonly summary: string
  /** The skills it earns, in its mission.yaml's order: the Skills view names the stop by the first. */
  readonly skills: readonly JourneySkill[]
  readonly needs: readonly JourneyNeed[]
  /** About how long it takes a new player, when its mission.yaml says. */
  readonly minutes: number | null
  /** The Codex cards it adds. */
  readonly codex: readonly { readonly id: string; readonly term: string }[]
  readonly attempts: number
  readonly hintsUsed: number
  readonly recoveryTargetMs: number
}

/** A region of a stage: a few missions on one subject, under their own heading, as Kernelfall's regions. */
export interface JourneyRegion {
  /** `first-router/meet-the-router`: unique across the map. */
  readonly key: string
  readonly id: string
  readonly name: string
  readonly caption: string
  /** The FRR daemons who speak in its missions. */
  readonly guide: string
  /** Where it lives in FRR's source tree. */
  readonly source: string
  readonly stops: readonly JourneyStop[]
  readonly done: number
  readonly tone: Tone
  /** "passed · 3 of 3", "in progress · 0 of 4", "ahead · 0 of 5". */
  readonly progress: string
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
  /** The FRR daemons and features the stage works with, as the README lists them. */
  readonly parts: readonly string[]
  /** Its missions; none for a planned stage. */
  readonly stops: readonly JourneyStop[]
  /** Its missions grouped under their headings; none for a planned stage. */
  readonly regions: readonly JourneyRegion[]
  /** What the road passes through, in travel order: the missions, or the one planned stop. */
  readonly marks: readonly JourneyStop[]
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
