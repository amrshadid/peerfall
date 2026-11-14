import type { MapDetail } from '@features/map/types'

export const PLAN_NOTES = {
  planned: "This stage's missions are still being built. Its place on the map is already drawn.",
  locked: 'Locked until you have the skills it needs.',
} as const

/** The row that says what a stop is about: a mission has an objective, a planned stage a subject. */
export const ABOUT_TERMS = { mission: 'Objective', planned: 'Covers' } as const

/** How long a mission takes before its mission.yaml says: the middle of MISSIONS.md's 10 to 20 minutes. */
export const TYPICAL_MISSION_TIME = 'About 15 min'

/** The panel with no stop selected: a map with no stops at all. */
export const EMPTY_DETAIL: MapDetail = {
  place: '',
  title: 'Peer Map',
  state: 'locked',
  planned: false,
  status: '',
  about: null,
  skills: [],
  needs: null,
  time: null,
  attempts: null,
  hints: null,
  recovery: null,
  parts: [],
  codex: [],
  play: null,
  note: null,
}

export const MS_PER_SECOND = 1000
