/** Section 2 sets code and terminal at 14px on a 20px line. */
export const FONT_SIZE_PX = 14
export const LINE_HEIGHT = 1.25

export const SCROLLBACK_LINES = 5000

/** The columns the type shrinks to keep: FRR's tables (`show ip route`, `show ip ospf neighbor`) are laid out for 80. */
export const CONSOLE_COLS = 80

/** The smallest the type shrinks to keep 80 columns in sight; below it the console gets fewer columns and wraps. */
export const MIN_FONT_SIZE_PX = 11
export const FONT_STEP_PX = 0.5

/** xterm's own vertical scrollbar (ViewportConstants.DEFAULT_SCROLL_BAR_WIDTH), which the grid sits beside. */
export const SCROLLBAR_PX = 14

/** IBM Plex Mono's advance width per px of type, for when the browser can't measure it. */
export const FALLBACK_CELL_WIDTH_PER_PX = 0.6
