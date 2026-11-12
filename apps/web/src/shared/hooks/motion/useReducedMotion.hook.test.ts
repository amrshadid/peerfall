// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useReducedMotion } from './useReducedMotion.hook'

/** A `matchMedia` whose answer the test flips, like the player changing the system setting. */
function stubMatchMedia(initial: boolean) {
  const listeners = new Set<() => void>()
  const media = {
    matches: initial,
    addEventListener: (_type: string, listener: () => void) => listeners.add(listener),
    removeEventListener: (_type: string, listener: () => void) => listeners.delete(listener),
  }
  vi.stubGlobal('matchMedia', () => media)
  return {
    listeners,
    set(matches: boolean) {
      media.matches = matches
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

describe('useReducedMotion', () => {
  it('follows the system setting live', () => {
    const system = stubMatchMedia(false)
    const { result, unmount } = renderHook(() => useReducedMotion())
    expect(result.current).toBe(false)
    act(() => system.set(true))
    expect(result.current).toBe(true)
    unmount()
    expect(system.listeners.size).toBe(0)
  })
})
