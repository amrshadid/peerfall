// @vitest-environment jsdom
import { configureApp, resetAppConfig } from '@app/config'
import { useAppStore } from '@app/store'
import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useTourScreen } from './useTourScreen.hook'

const driver = vi.hoisted(() => ({ played: 0, stopped: 0 }))

vi.mock('@features/tour/utils/driver', () => ({
  isTourActive: () => false,
  isOnScreen: () => true,
  playTour: () => {
    driver.played++
  },
  stopTour: () => {
    driver.stopped++
  },
}))

beforeEach(() => {
  vi.useFakeTimers()
  vi.stubGlobal('matchMedia', () => ({ matches: false }))
  driver.played = 0
  driver.stopped = 0
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
  useAppStore.getState().resetSettings()
})

describe('useTourScreen', () => {
  it('waits for the consent notice to be answered before its tour covers the screen', () => {
    configureApp({ clarityId: 'abc123' })
    renderHook(() => useTourScreen('title'))
    vi.runAllTimers()
    expect(driver.played).toBe(0)
    act(() => useAppStore.getState().setClarityConsent('denied'))
    vi.runAllTimers()
    expect(driver.played).toBe(1)
    resetAppConfig()
  })

  it('registers the screen, starts its tour once it has settled, and cleans up on leaving', () => {
    const { unmount } = renderHook(() => useTourScreen('title'))
    expect(useAppStore.getState().tourScreen).toBe('title')
    expect(driver.played).toBe(0)

    vi.runAllTimers()
    expect(driver.played).toBe(1)

    unmount()
    expect(useAppStore.getState().tourScreen).toBeNull()
    expect(driver.stopped).toBe(1)
  })

  it('starts on its own only once per screen', () => {
    renderHook(() => useTourScreen('title')).unmount()
    vi.runAllTimers()
    renderHook(() => useTourScreen('title'))
    vi.runAllTimers()
    expect(driver.played).toBe(1)
  })

  it('checks again for unseen stops when the mission opens a panel', () => {
    const { rerender } = renderHook(({ panels }) => useTourScreen('mission', panels), {
      initialProps: { panels: 'guide' },
    })
    vi.runAllTimers()
    useAppStore.getState().resetToursSeen()
    rerender({ panels: 'guide,terminal' })
    vi.runAllTimers()
    expect(driver.played).toBe(2)
  })
})
