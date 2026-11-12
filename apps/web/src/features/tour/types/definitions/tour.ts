/** One stop on a tour: the panel it points at and one short sentence about it. */
export interface TourStop {
  /** Stable id kept in the save once shown, e.g. `level:terminal`. */
  readonly id: string
  /** The element to highlight; the stop is skipped while it isn't on screen. */
  readonly selector: string
  readonly title: string
  readonly text: string
  readonly side?: 'top' | 'right' | 'bottom' | 'left'
  /**
   * Where along that side; `end` keeps the card off the start of the panel
   * beside it (the terminal's prompt, the editor's first lines, the Guide's Next button).
   */
  readonly align?: 'start' | 'center' | 'end'
}

/** Auto-start shows only stops not seen yet; a replay shows every stop on screen. */
export type TourMode = 'auto' | 'replay'
