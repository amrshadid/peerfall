import { FitAddon } from '@xterm/addon-fit'
import { Terminal } from '@xterm/xterm'
import { consoleSize } from './console-size.util'
import {
  CONSOLE_COLS,
  FALLBACK_CELL_WIDTH_PER_PX,
  FONT_SIZE_PX,
  LINE_HEIGHT,
  SCROLLBACK_LINES,
  SCROLLBAR_PX,
} from './terminal.constants'
import { followTheme } from './terminal-theme.util'

export interface OpenTerminalOptions {
  /** False for a real tty, which turns "\n" into "\r\n" itself (ONLCR); true by default. */
  readonly convertEol?: boolean
}

export interface OpenTerminal {
  readonly terminal: Terminal
  /** Stops following the page's size and theme, and closes the terminal. */
  readonly dispose: () => void
}

const MEASURE_PX = 100

// Measured the way xterm measures its cells (a canvas, the width of "W"), so both agree on the columns.
function cellWidthPerPx(fontFamily: string): number {
  const context = typeof OffscreenCanvas === 'undefined' ? null : new OffscreenCanvas(1, 1).getContext('2d')
  if (!context) {
    return FALLBACK_CELL_WIDTH_PER_PX
  }
  context.font = `${MEASURE_PX}px ${fontFamily}`
  return context.measureText('W').width / MEASURE_PX || FALLBACK_CELL_WIDTH_PER_PX
}

// Never fewer than 80 columns: a narrow box shrinks the type, then scrolls. A wide one gets more columns.
function sizeToBox(terminal: Terminal, fit: FitAddon): void {
  const box = terminal.element
  const parent = box?.parentElement
  if (!box || !parent) {
    return
  }
  const style = getComputedStyle(box)
  const padding = (Number.parseFloat(style.paddingLeft) || 0) + (Number.parseFloat(style.paddingRight) || 0)
  const width = parent.clientWidth - padding - SCROLLBAR_PX
  const size = consoleSize(width, cellWidthPerPx(terminal.options.fontFamily ?? ''))
  if (terminal.options.fontSize !== size.fontSize) {
    terminal.options.fontSize = size.fontSize
  }
  box.style.width = size.scrolls ? `${Math.ceil(size.gridWidth + padding + SCROLLBAR_PX)}px` : ''
  const proposed = fit.proposeDimensions()
  if (!proposed || Number.isNaN(proposed.rows) || Number.isNaN(proposed.cols)) {
    return
  }
  const cols = size.scrolls ? CONSOLE_COLS : Math.max(CONSOLE_COLS, proposed.cols)
  if (proposed.rows !== terminal.rows || cols !== terminal.cols) {
    terminal.resize(cols, proposed.rows)
  }
}

/** An xterm.js terminal in `element`: at least 80 columns, as many rows as fit, the page's theme. */
export function openTerminal(element: HTMLElement, { convertEol = true }: OpenTerminalOptions = {}): OpenTerminal {
  const terminal = new Terminal({
    cursorBlink: true,
    // Turns "\n" into "\r\n", the job of the tty's ONLCR output flag.
    convertEol,
    cols: CONSOLE_COLS,
    fontFamily: getComputedStyle(element).fontFamily,
    fontSize: FONT_SIZE_PX,
    lineHeight: LINE_HEIGHT,
    scrollback: SCROLLBACK_LINES,
  })
  const fit = new FitAddon()
  terminal.loadAddon(fit)
  terminal.open(element)
  sizeToBox(terminal, fit)
  const resize = new ResizeObserver(() => sizeToBox(terminal, fit))
  resize.observe(element)
  const unfollowTheme = followTheme(terminal, element)

  return {
    terminal,
    dispose: () => {
      unfollowTheme()
      resize.disconnect()
      terminal.dispose()
    },
  }
}
