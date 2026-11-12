import type { MapDetail } from '@features/map/types'

export const PLAN_NOTES = {
  locked: 'Locked until the missions it needs are completed.',
  empty: 'No mission is written yet. Every stage of the journey is drawn as planned.',
} as const

/** The panel with no stop selected: a map with no missions at all. */
export const EMPTY_DETAIL: MapDetail = {
  place: '',
  title: 'Map',
  state: 'locked',
  status: '',
  objective: null,
  needs: [],
  attempts: '',
  hints: '',
  recovery: null,
  play: null,
  note: PLAN_NOTES.empty,
}

export const MS_PER_SECOND = 1000
