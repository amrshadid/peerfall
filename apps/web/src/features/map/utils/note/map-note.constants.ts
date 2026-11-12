/** How a stop's state reads in the note under the drawing. */
export const NOTE_STATES = {
  next: 'Next up',
  available: 'Available',
  progress: 'In progress',
  planned: 'Not built yet',
  done: 'Done',
  clean: 'Done, first try',
  helped: 'Done with help',
  lockedUnknown: 'Locked: it needs missions that are not completed yet',
} as const

/** Added to the note of a stage with no missions, after what it covers. */
export const PLANNED_NOTE = 'Its missions are not built yet; its place on the journey is already drawn.'
