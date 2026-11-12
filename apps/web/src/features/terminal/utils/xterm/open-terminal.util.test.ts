// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { openTerminal } from './open-terminal.util'
import { CONSOLE_COLS, FONT_SIZE_PX, LINE_HEIGHT, MIN_FONT_SIZE_PX, SCROLLBACK_LINES } from './terminal.constants'

const xterm = vi.hoisted(() => ({
  options: null as Record<string, unknown> | null,
  calls: [] as string[],
  proposed: { cols: 50, rows: 30 },
}))

vi.mock('@xterm/xterm', () => ({
  Terminal: class {
    options: Record<string, unknown>
    element: HTMLElement | undefined
    cols: number
    rows = 24
    constructor(options: Record<string, unknown>) {
      this.options = options
      this.cols = options.cols as number
      xterm.options = options
    }
    loadAddon() {}
    open(parent: HTMLElement) {
      this.element = parent.appendChild(document.createElement('div'))
      xterm.calls.push('open')
    }
    resize(cols: number, rows: number) {
      this.cols = cols
      this.rows = rows
      xterm.calls.push(`resize ${cols}x${rows}`)
    }
    dispose() {
      xterm.calls.push('terminal')
    }
  },
}))
vi.mock('@xterm/addon-fit', () => ({
  FitAddon: class {
    proposeDimensions() {
      return xterm.proposed
    }
  },
}))

// jsdom lays nothing out, so the box's width is set by hand.
function box(width: number): HTMLElement {
  const element = document.createElement('div')
  Object.defineProperty(element, 'clientWidth', { value: width })
  return element
}

beforeEach(() => {
  xterm.calls = []
  xterm.proposed = { cols: 50, rows: 30 }
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {
        xterm.calls.push('observe')
      }
      disconnect() {
        xterm.calls.push('disconnect')
      }
    }
  )
  vi.stubGlobal('matchMedia', () => ({ addEventListener() {}, removeEventListener() {} }))
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('openTerminal', () => {
  it("opens at Section 2's type size with at least 80 columns, the rows fitted to its box", () => {
    const { terminal } = openTerminal(box(1000))
    expect(xterm.options).toMatchObject({
      cols: CONSOLE_COLS,
      fontSize: FONT_SIZE_PX,
      lineHeight: LINE_HEIGHT,
      scrollback: SCROLLBACK_LINES,
      convertEol: true,
    })
    expect(xterm.calls).toEqual(['open', 'resize 80x30', 'observe'])
    expect(terminal.element?.style.width).toBe('')
  })

  it('takes every column a wide box has room for', () => {
    xterm.proposed = { cols: 132, rows: 30 }
    const { terminal } = openTerminal(box(1400))
    expect(terminal.cols).toBe(132)
  })

  it('keeps 80 columns in a narrow box: the type shrinks to its floor, then the box scrolls sideways', () => {
    const { terminal } = openTerminal(box(300))
    expect(terminal.cols).toBe(CONSOLE_COLS)
    expect(terminal.options.fontSize).toBe(MIN_FONT_SIZE_PX)
    // 80 cells of 6.6px and xterm's 14px scrollbar.
    expect(terminal.element?.style.width).toBe('542px')
  })

  it('stops following its element and closes the terminal on dispose', () => {
    const { dispose } = openTerminal(box(1000))
    xterm.calls = []
    dispose()
    expect(xterm.calls).toEqual(['disconnect', 'terminal'])
  })
})
