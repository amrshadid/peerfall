// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useWideEnough } from './useWideEnough.hook'

/** A window whose width the test sets; `matchMedia` answers `(min-width: Npx)` from it. */
function stubWindowWidth(initial: number) {
  let width = initial
  const listeners = new Set<() => void>()
  vi.stubGlobal('matchMedia', (query: string) => {
    const min = Number(/\d+/.exec(query)?.[0])
    return {
      get matches() {
        return width >= min
      },
      addEventListener: (_type: string, listener: () => void) => listeners.add(listener),
      removeEventListener: (_type: string, listener: () => void) => listeners.delete(listener),
    }
  })
  return {
    resize(next: number) {
      width = next
      for (const listener of listeners) {
        listener()
      }
    },
  }
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('useWideEnough', () => {
  it('follows the window across the play width', () => {
    const browser = stubWindowWidth(1280)
    const { result } = renderHook(() => useWideEnough())
    expect(result.current).toBe(true)
    act(() => browser.resize(800))
    expect(result.current).toBe(false)
  })

  it('takes another width when asked', () => {
    stubWindowWidth(1280)
    expect(renderHook(() => useWideEnough(1440)).result.current).toBe(false)
  })
})
