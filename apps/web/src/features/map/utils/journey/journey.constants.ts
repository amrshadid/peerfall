import type { StopState } from '@features/map/types'
import type { MissionStatus } from '@peerfall/game/types'

/** The shape each mission status is drawn in. */
export const STOP_STATES: Readonly<Record<MissionStatus, StopState>> = {
  locked: 'locked',
  available: 'available',
  in_progress: 'progress',
  completed: 'done',
}

/** How a stop's state is spoken and printed. */
export const STATUS_WORDS: Readonly<Record<StopState, string>> = {
  locked: 'locked',
  available: 'available',
  progress: 'in progress',
  done: 'completed',
}

/** Added to the status of the stop Continue goes to. */
export const HERE_WORDS = 'you are here'

/** What a stage without missions says where the others say "1 of 1 passed". */
export const PLANNED_PROGRESS = 'Planned: no missions yet'
