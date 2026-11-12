import type { MapDetail } from '@features/map/types'

export const PLAN_NOTES = {
  planned: "This stage's missions are still being built. Its place on the map is already drawn.",
  locked: 'Locked until the missions it needs are completed.',
} as const

/** The row that says what a stop is about: a mission has an objective, a planned stage a subject. */
export const ABOUT_TERMS = { mission: 'Objective', planned: 'Covers' } as const

/** The panel with no stop selected: a map with no stops at all. */
export const EMPTY_DETAIL: MapDetail = {
  place: '',
  title: 'Peer Map',
  state: 'locked',
  planned: false,
  status: '',
  about: null,
  parts: [],
  needs: null,
  attempts: null,
  hints: null,
  recovery: null,
  play: null,
  note: null,
}

export const MS_PER_SECOND = 1000
