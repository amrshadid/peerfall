// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useNow } from './useNow.hook'

const START = Date.UTC(2026, 9, 30, 12)
const TICK_MS = 1_000

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(START)
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('useNow', () => {
  it('starts at the current time and moves on every tick', () => {
    const { result } = renderHook(() => useNow(TICK_MS))
    expect(result.current).toBe(START)
    act(() => {
      vi.advanceTimersByTime(TICK_MS)
    })
    expect(result.current).toBe(START + TICK_MS)
  })

  it('stops ticking once unmounted', () => {
    const { unmount } = renderHook(() => useNow(TICK_MS))
    unmount()
    expect(vi.getTimerCount()).toBe(0)
  })
})
