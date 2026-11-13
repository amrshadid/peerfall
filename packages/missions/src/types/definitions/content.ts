import type { GameContent, MissionId } from '@peerfall/game/types'
import type { Story } from '#types/definitions/story'

export const CHAPTERS_FILE = 'chapters.yaml'
export const CONCEPTS_FILE = 'concepts.yaml'
export const FIELD_GUIDE_FILE = 'field-guide.yaml'
export const MISSION_FILE = 'mission.yaml'
export const STORY_FILE = 'story.md'
/** The golden runs. Read by the recorder only: the game never bundles it. */
export const SOLUTION_FILE = 'solution.yaml'

/** Every content file's text, keyed by its path in `content/`. */
export interface ContentFiles {
  readonly chapters: string
  readonly concepts: string
  readonly fieldGuide: string
  /** `4-recover-from-failure/01-the-link-that-never-went-down/mission.yaml` → its text. */
  readonly missions: Readonly<Record<string, string>>
  /** `4-recover-from-failure/01-the-link-that-never-went-down/story.md` → its text. */
  readonly stories: Readonly<Record<string, string>>
}

/** The whole game's content, parsed and checked. */
export interface LoadedContent {
  /** What `configureGame({ content })` takes. */
  readonly game: GameContent
  /** The mission's paced story, every section its mission.yaml points at present. */
  readonly storyOf: (id: MissionId) => Story | undefined
  /** The mission's folder in `content/`, for error messages and the recorder. */
  readonly folderOf: (id: MissionId) => string | undefined
}
