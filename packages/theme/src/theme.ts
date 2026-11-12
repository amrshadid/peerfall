import { DURATION_MS, EASING, REDUCED_MOTION_DURATION_MS } from '#motion/index'
import { DAY_PRINT, NIGHT_PRINT } from '#palettes/index'
import { ICON_GRID_PX, ICON_STROKE_PX, RADIUS, RULE_THIN_WIDTH_PX, RULE_WIDTH_PX } from '#spacing/index'
import type { Palette, PrintName } from '#types/definitions/palette'
import {
  BODY_FONT_SIZE_REM,
  BODY_LINE_HEIGHT,
  DISPLAY_LINE_HEIGHT,
  FONT_FACE,
  FONT_MONO,
  FONT_WEIGHT,
  FONT_WIDTH,
  LETTER_SPACING,
} from '#typography/index'

export const PRINTS: Readonly<Record<PrintName, Palette>> = {
  day: DAY_PRINT,
  night: NIGHT_PRINT,
}

/** Every Section 2 token in one object (docs/BRAND.md). */
export const theme = {
  prints: PRINTS,
  rule: { width: RULE_WIDTH_PX, thinWidth: RULE_THIN_WIDTH_PX },
  radius: RADIUS,
  icon: { grid: ICON_GRID_PX, stroke: ICON_STROKE_PX },
  typography: {
    face: FONT_FACE,
    mono: FONT_MONO,
    weight: FONT_WEIGHT,
    width: FONT_WIDTH,
    letterSpacing: LETTER_SPACING,
    bodySizeRem: BODY_FONT_SIZE_REM,
    bodyLineHeight: BODY_LINE_HEIGHT,
    displayLineHeight: DISPLAY_LINE_HEIGHT,
  },
  motion: {
    duration: DURATION_MS,
    reducedDuration: REDUCED_MOTION_DURATION_MS,
    easing: EASING,
  },
} as const

export type Theme = typeof theme
