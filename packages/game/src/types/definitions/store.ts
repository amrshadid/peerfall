import type { MissionVerdict } from '#types/definitions/checks'
import type { MissionDefinition } from '#types/definitions/mission'

/** Whether the player's save has been loaded into the progress store. */
export const GAME_STATUS = {
  closed: 'closed',
  opening: 'opening',
  open: 'open',
} as const

export type GameStatus = (typeof GAME_STATUS)[keyof typeof GAME_STATUS]

/** The mission loop: read the incident, work on the network, then the debrief once it has passed. */
export const MISSION_PHASES = ['incident', 'play', 'debrief'] as const

export type MissionPhase = (typeof MISSION_PHASES)[number]

/** The mission being played. Kept in memory only: a reload starts it from its incident again. */
export interface ActiveMission {
  readonly mission: MissionDefinition
  readonly phase: MissionPhase
  /** How the latest attempt was judged, or `null` before the first one. */
  readonly verdict: MissionVerdict | null
}
