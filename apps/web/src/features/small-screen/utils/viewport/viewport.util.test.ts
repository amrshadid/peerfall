import { describe, expect, it } from 'vitest'
import { MIN_PLAY_WIDTH_PX } from './viewport.constants'
import { type MediaQuery, minWidthQuery, viewportStore } from './viewport.util'

/** A media query whose width the test controls, like a window being resized. */
function fakeWindow(width: number, minWidth: number) {
  const listeners = new Set<() => void>()
  let current = width
  const media: MediaQuery = {
    get matches() {
      return current >= minWidth
    },
    addEventListener: (_type, listener) => listeners.add(listener),
    removeEventListener: (_type, listener) => listeners.delete(listener),
  }
  return {
    media,
    listeners,
    resize(next: number) {
      const before = current >= minWidth
      current = next
      if (before !== current >= minWidth) {
        for (const listener of listeners) {
          listener()
        }
      }
    },
  }
}

describe('minWidthQuery', () => {
  it('asks for the play width in CSS pixels', () => {
    expect(minWidthQuery(MIN_PLAY_WIDTH_PX)).toBe('(min-width: 1024px)')
  })
})

describe('viewportStore', () => {
  it('is wide at exactly the breakpoint and narrow one pixel below', () => {
    expect(viewportStore(fakeWindow(1024, MIN_PLAY_WIDTH_PX).media).getSnapshot()).toBe(true)
    expect(viewportStore(fakeWindow(1023, MIN_PLAY_WIDTH_PX).media).getSnapshot()).toBe(false)
  })

  it('tells subscribers when a resize crosses the breakpoint, both ways', () => {
    const win = fakeWindow(1440, MIN_PLAY_WIDTH_PX)
    const store = viewportStore(win.media)
    const seen: boolean[] = []
    const unsubscribe = store.subscribe(() => seen.push(store.getSnapshot()))

    win.resize(1280)
    win.resize(800)
    win.resize(1100)
    expect(seen).toEqual([false, true])

    unsubscribe()
    expect(win.listeners.size).toBe(0)
  })

  it('reports wide when the browser has no matchMedia, so play is never blocked by mistake', () => {
    const store = viewportStore(null)
    expect(store.getSnapshot()).toBe(true)
    expect(() => store.subscribe(() => {})()).not.toThrow()
  })
})
