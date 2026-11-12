export const TOUR_DRAWING = {
  /** The theme's `--t-base`, so the highlight moves at the kit's own pace. */
  durationMs: 220,
  /** The desk under the sheets, as a dialog's backdrop: a paper dim in Day print, never a black veil. */
  overlayColor: 'var(--ground)',
  /** A dialog backdrop's 70%, so a tour dims like a dialog. */
  overlayOpacity: 0.7,
  /** Keeps the line off the text of a target with no rule to sit on. */
  loosePaddingPx: 6,
  /** Air for the 6px arrow between the highlight and the card. */
  popoverOffsetPx: 10,
} as const

/** Rem sizes lay out on sub-pixels, so a rule this close still touches. */
export const RULE_TOLERANCE_PX = 1

export const TOUR_FRAME_SELECTOR = '.pf-sheet, .screen__topbar'

/** Scopes every popover rule in tour.css. */
export const TOUR_POPOVER_CLASS = 'pf-tour'

export const TOUR_AIM_CLASS = 'pf-tour-aim'

/** Off while the cut-out glides, so the line never trails it. */
export const TOUR_AIM_SHOWN_CLASS = 'pf-tour-aim--shown'

export const TOUR_PROGRESS_TEXT = '{{current}} of {{total}}'
