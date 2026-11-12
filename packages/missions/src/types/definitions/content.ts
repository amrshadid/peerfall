import type { GameContent, MissionId } from '@peerfall/game/types'

export const CHAPTERS_FILE = 'chapters.yaml'
export const MISSION_FILE = 'mission.yaml'
export const INCIDENT_FILE = 'incident.md'
export const DEBRIEF_FILE = 'debrief.md'
/** The golden runs. Read by the recorder only: the game never bundles it. */
export const SOLUTION_FILE = 'solution.yaml'

/** Every content file's text, keyed by its path in `content/`. */
export interface ContentFiles {
  readonly chapters: string
  /** `4-recover-from-failure/01-the-link-that-never-went-down/mission.yaml` → its text. */
  readonly missions: Readonly<Record<string, string>>
  readonly incidents: Readonly<Record<string, string>>
  readonly debriefs: Readonly<Record<string, string>>
}

/** What a mission says beside its definition, as Markdown. */
export interface MissionTexts {
  readonly incident: string
  readonly debrief: string
}

/** The whole game's content, parsed and checked. */
export interface LoadedContent {
  /** What `configureGame({ content })` takes. */
  readonly game: GameContent
  readonly textsOf: (id: MissionId) => MissionTexts | undefined
  /** The mission's folder in `content/`, for error messages and the recorder. */
  readonly folderOf: (id: MissionId) => string | undefined
}
