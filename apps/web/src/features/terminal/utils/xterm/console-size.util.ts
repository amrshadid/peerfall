import { CONSOLE_COLS, FONT_SIZE_PX, FONT_STEP_PX, MIN_FONT_SIZE_PX } from './terminal.constants'

export interface ConsoleSize {
  readonly fontSize: number
  /** What the console's columns take, in px. */
  readonly gridWidth: number
  /** True when even the smallest type can't fit the columns: the console gets fewer, and lines wrap at the box's edge. */
  readonly narrow: boolean
}

/** The largest type, from 14px down to 11px, that keeps the console's columns inside `width` px. */
export function consoleSize(width: number, cellWidthPerPx: number): ConsoleSize {
  const fitting = Math.floor(width / (CONSOLE_COLS * cellWidthPerPx) / FONT_STEP_PX) * FONT_STEP_PX
  const fontSize = Math.min(FONT_SIZE_PX, Math.max(MIN_FONT_SIZE_PX, fitting))
  const gridWidth = CONSOLE_COLS * cellWidthPerPx * fontSize
  return { fontSize, gridWidth, narrow: gridWidth > width }
}
