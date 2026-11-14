import type { StopState, Tone } from '@features/map/types'

/** The states of a mission whose checks have passed. */
export const DONE_STATES: ReadonlySet<StopState> = new Set(['done', 'clean', 'helped'])

/** How a stop's state is spoken and printed. */
export const STATUS_WORDS: Readonly<Record<StopState, string>> = {
  locked: 'locked',
  available: 'available',
  progress: 'in progress',
  done: 'done',
  clean: 'done, first try',
  helped: 'done with help',
}

/** How a region's tone is printed before its count, as Kernelfall's "rebuilt", "in progress" and "dark". */
export const TONE_WORDS: Readonly<Record<Tone, string>> = {
  passed: 'passed',
  progress: 'in progress',
  ahead: 'ahead',
  planned: 'planned',
}

/** Added to the status of the stop Continue goes to. */
export const HERE_WORDS = 'you are here'

/** What a stage without missions says where the others say "1 of 1 passed". */
export const PLANNED_PROGRESS = 'Planned: no missions yet'

/** The one stop of a stage with no missions yet: what it says where a mission has its status and title. */
export const PLANNED_STOP = {
  status: 'not built yet',
  title: 'Missions to come',
  /** After the stage's number: "1 · planned", as a boss stop reads "1.B · boss" in Kernelfall. */
  tag: 'planned',
} as const
