import { CONSOLE_COLS, FONT_SIZE_PX, FONT_STEP_PX, MIN_FONT_SIZE_PX } from './terminal.constants'

export interface ConsoleSize {
  readonly fontSize: number
  /** What the 80 columns take, in px. */
  readonly gridWidth: number
  /** True when even the smallest type is wider than the box: the terminal scrolls sideways instead of wrapping. */
  readonly scrolls: boolean
}

/** The largest type, from 14px down to 11px, that keeps the console's 80 columns inside `width` px. */
export function consoleSize(width: number, cellWidthPerPx: number): ConsoleSize {
  const fitting = Math.floor(width / (CONSOLE_COLS * cellWidthPerPx) / FONT_STEP_PX) * FONT_STEP_PX
  const fontSize = Math.min(FONT_SIZE_PX, Math.max(MIN_FONT_SIZE_PX, fitting))
  const gridWidth = CONSOLE_COLS * cellWidthPerPx * fontSize
  return { fontSize, gridWidth, scrolls: gridWidth > width }
}
