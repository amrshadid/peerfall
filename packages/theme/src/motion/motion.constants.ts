/** Durations in ms. Motion behaves like machinery: fed, stamped, stepped and indexed. */
export const DURATION_MS = {
  instant: 80,
  fast: 150,
  base: 220,
  slow: 400,
  story: 800,
} as const

/** Easing curves as CSS `cubic-bezier()` values. */
export const EASING = {
  standard: 'cubic-bezier(0.2, 0, 0, 1)',
  in: 'cubic-bezier(0.05, 0.7, 0.1, 1)',
  out: 'cubic-bezier(0.3, 0, 1, 1)',
} as const

/** What every animation and transition collapses to under reduced motion. */
export const REDUCED_MOTION_DURATION_MS = 1
