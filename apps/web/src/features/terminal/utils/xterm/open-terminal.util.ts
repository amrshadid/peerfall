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

// The type shrinks first, so 80 columns stay in sight while they can; then the columns are what the
// box holds. They are xterm's own count, from the cells it really draws: a column more than that is
// drawn past the panel's edge, cut off. The guest's tty is told the same size and wraps there.
// Returns whether the type changed.
function sizeToBox(terminal: Terminal, fit: FitAddon): boolean {
  const box = terminal.element
  const parent = box?.parentElement
  if (!box || !parent) {
    return false
  }
  const style = getComputedStyle(box)
  const padding = (Number.parseFloat(style.paddingLeft) || 0) + (Number.parseFloat(style.paddingRight) || 0)
  const width = parent.clientWidth - padding - SCROLLBAR_PX
  const size = consoleSize(width, cellWidthPerPx(terminal.options.fontFamily ?? ''))
  const retyped = terminal.options.fontSize !== size.fontSize
  if (retyped) {
    terminal.options.fontSize = size.fontSize
  }
  const proposed = fit.proposeDimensions()
  if (!proposed || Number.isNaN(proposed.rows) || Number.isNaN(proposed.cols)) {
    return retyped
  }
  if (proposed.rows !== terminal.rows || proposed.cols !== terminal.cols) {
    terminal.resize(proposed.cols, proposed.rows)
  }
  return retyped
}

/** An xterm.js terminal in `element`: as many columns and rows as its box shows, the page's theme. */
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
  let frame: number | null = null
  // xterm measures its cells again after a new type size or a font that finished loading; the
  // columns are counted once more on the next frame, in the cells it then draws.
  const refit = () => {
    if (frame !== null) {
      cancelAnimationFrame(frame)
    }
    frame = requestAnimationFrame(() => {
      frame = null
      sizeToBox(terminal, fit)
    })
  }
  const size = () => {
    if (sizeToBox(terminal, fit)) {
      refit()
    }
  }
  size()
  const resize = new ResizeObserver(size)
  resize.observe(element)
  // Missing where nothing is drawn (jsdom).
  const fonts: FontFaceSet | undefined = document.fonts
  fonts?.addEventListener('loadingdone', refit)
  const unfollowTheme = followTheme(terminal, element)

  return {
    terminal,
    dispose: () => {
      unfollowTheme()
      resize.disconnect()
      fonts?.removeEventListener('loadingdone', refit)
      if (frame !== null) {
        cancelAnimationFrame(frame)
      }
      terminal.dispose()
    },
  }
}
