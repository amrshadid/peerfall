/** The least share of the gauge a stage gets, so a short planned stage still has room for its name beside a long one. */
export const MIN_GAUGE_SHARE = 0.06

/** The least share of the gauge the in-view window takes, so it never shrinks out of sight. */
export const MIN_VIEW_SHARE = 0.02

/** The stage in view is the one at mid-view. */
export const ACTIVE_AT = 0.5

/** Raising the small shares shrinks the rest; this many passes settle them. */
export const GAUGE_SETTLE_PASSES = 3

/** Keep a focused stop this far from the top and bottom of the view, in px. */
export const KEEP_IN_VIEW_TOP = 90
export const KEEP_IN_VIEW_BOTTOM = 130

/** Where "You are here" lands in the view, from the top. */
export const HERE_AT = 0.45
