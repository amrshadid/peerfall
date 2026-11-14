// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { type TerminalViewOptions, useTerminalView } from './useTerminalView.hook'

/** What the fake terminal was asked to show, and the player's keyboard. */
const screen = vi.hoisted(() => ({
  text: '',
  opened: 0,
  type: (_data: string) => {},
  resize: (_size: { rows: number; cols: number }) => {},
}))

vi.mock('@xterm/xterm', () => ({
  Terminal: class {
    options = {}
    rows = 24
    cols = 80
    loadAddon() {}
    onResize(listener: (size: { rows: number; cols: number }) => void) {
      screen.resize = listener
      return { dispose() {} }
    }
    open() {
      screen.opened++
    }
    onData(listener: (data: string) => void) {
      screen.type = listener
      return { dispose() {} }
    }
    write(data: string | Uint8Array) {
      screen.text += typeof data === 'string' ? data : new TextDecoder().decode(data)
    }
    focus() {}
    reset() {
      screen.text = ''
    }
    dispose() {}
  },
}))
vi.mock('@xterm/addon-fit', () => ({
  FitAddon: class {
    proposeDimensions() {
      return undefined
    }
  },
}))
vi.mock('@xterm/xterm/css/xterm.css', () => ({}))

const encode = (text: string) => new TextEncoder().encode(text)

function open(overrides: Partial<TerminalViewOptions> = {}) {
  const sent: string[] = []
  const sizes: [number, number][] = []
  const container = { current: document.createElement('div') }
  const options: TerminalViewOptions = {
    onInput: (data) => sent.push(data),
    onResize: (rows, cols) => sizes.push([rows, cols]),
    ...overrides,
  }
  const hook = renderHook((props: TerminalViewOptions) => useTerminalView(container, props), {
    initialProps: options,
  })
  return { ...hook, sent, sizes, options }
}

beforeEach(() => {
  screen.text = ''
  screen.opened = 0
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    }
  )
  vi.stubGlobal('matchMedia', () => ({ addEventListener() {}, removeEventListener() {} }))
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('useTerminalView', () => {
  it('shows what is written and hands every key out, escape sequences and all', () => {
    const { result, sent } = open()
    act(() => result.current.write(encode('a:~# ')))
    expect(screen.text).toBe('a:~# ')
    act(() => screen.type('vtysh\r'))
    act(() => screen.type('\x1b[A'))
    act(() => screen.type('\x03'))
    expect(sent).toEqual(['vtysh\r', '\x1b[A', '\x03'])
  })

  it('shows output in the order it arrived, across many chunks', () => {
    const { result } = open()
    act(() => {
      for (const chunk of ['a', 'b', 'c\r\n', 'd']) {
        result.current.write(encode(chunk))
      }
    })
    expect(screen.text).toBe('abc\r\nd')
  })

  it('clears the whole screen, the last prompt too, and shows what comes after', () => {
    const { result } = open()
    act(() => result.current.write('a# '))
    act(() => result.current.clear())
    expect(screen.text).toBe('')
    act(() => result.current.write('a# '))
    expect(screen.text).toBe('a# ')
  })

  it('drops every key while locked, and hands them out again once unlocked', () => {
    const { rerender, sent, options } = open({ locked: true })
    act(() => screen.type('ls\r'))
    expect(sent).toEqual([])
    rerender({ ...options, locked: false })
    act(() => screen.type('pwd\r'))
    expect(sent).toEqual(['pwd\r'])
  })

  it('reports the size it opened at, and each new one', () => {
    const { sizes } = open()
    act(() => screen.resize({ rows: 37, cols: 132 }))
    expect(sizes).toEqual([
      [24, 80],
      [37, 132],
    ])
  })

  it('keeps one terminal, and a stable way to write, when the callbacks change', () => {
    const { result, rerender, options } = open()
    const { write } = result.current
    const sent: string[] = []
    rerender({ ...options, onInput: (data) => sent.push(data) })
    expect(screen.opened).toBe(1)
    expect(result.current.write).toBe(write)
    act(() => screen.type('x'))
    expect(sent).toEqual(['x'])
  })
})
