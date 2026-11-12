/** Archivo carries every non-code text; its width axis does the work. */
export const FONT_FACE = '"Archivo Variable", "Archivo", "Helvetica Neue", Arial, sans-serif'

/** IBM Plex Mono, only where the text is real code, terminal output or a kernel identifier. */
export const FONT_MONO = '"IBM Plex Mono", ui-monospace, Menlo, monospace'

/** Archivo's `wdth` axis per type role. */
export const FONT_WIDTH = {
  /** Dense labels: man-page heads, drawing callouts, map labels. */
  condensed: 75,
  /** UI and prose. */
  normal: 100,
  /** Display: wordmark, screen and stage titles. */
  wide: 125,
} as const

export const FONT_WEIGHT = {
  wide: 700,
  display: 800,
} as const

/** Letter-spacing in em. */
export const LETTER_SPACING = {
  display: -0.035,
  wide: -0.01,
} as const

/** Body text size in rem (14px at the default UI scale). */
export const BODY_FONT_SIZE_REM = 0.875

export const BODY_LINE_HEIGHT = 1.4
export const DISPLAY_LINE_HEIGHT = 0.9
