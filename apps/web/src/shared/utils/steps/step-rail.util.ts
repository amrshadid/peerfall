import type { RailMode, StepState } from '@shared/types'

export interface RailWidths {
  /** The room the bar leaves the rail, in px. */
  readonly available: number
  /** The rail with every label, in px. */
  readonly full: number
  /** The rail with only the current step's label, in px. */
  readonly current: number
}

/** The most labels that fit; every label until the rail is laid out (0 px). */
export function railModeFor({ available, full, current }: RailWidths): RailMode {
  if (available <= 0 || full <= 0 || full <= available) {
    return 'full'
  }
  return current <= available ? 'current' : 'marks'
}

export function railLabelShown(mode: RailMode, state: StepState): boolean {
  return mode === 'full' || (mode === 'current' && state === 'current')
}

/** `currentIndex` past the last step (a finished mission) marks every step done. */
export function stepStates(count: number, currentIndex: number): readonly StepState[] {
  return Array.from({ length: count }, (_, index) => {
    if (index < currentIndex) {
      return 'done'
    }
    return index === currentIndex ? 'current' : 'future'
  })
}
