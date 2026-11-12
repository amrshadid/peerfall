// @vitest-environment jsdom
import { useAppStore } from '@app/store'
import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useTour } from './useTour.hook'

// driver.js needs a real layout; the hook's job is choosing the stops, so the driver is faked.
const driver = vi.hoisted(() => ({
  active: false,
  onScreen: new Set<string>(),
  played: [] as { ids: readonly string[]; animate: boolean }[],
}))

vi.mock('@features/tour/utils/driver', () => ({
  isTourActive: () => driver.active,
  isOnScreen: (selector: string) => driver.onScreen.has(selector),
  playTour: (stops: readonly { id: string }[], animate: boolean) => {
    driver.played.push({ ids: stops.map((stop) => stop.id), animate })
  },
  stopTour: () => {},
}))

beforeEach(() => {
  vi.stubGlobal('matchMedia', () => ({ matches: false }))
  driver.active = false
  // The editor and the timeline are still locked: only unlocked panels are on screen.
  driver.onScreen = new Set(['#mission-guide', '#mission-terminal'])
  driver.played = []
  useAppStore.getState().setTourScreen('mission')
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  useAppStore.getState().setTourScreen(null)
  useAppStore.getState().resetSettings()
  document.body.innerHTML = ''
})

describe('useTour', () => {
  it('plays the stops on screen once on its own, and every one on a replay', () => {
    const { result } = renderHook(() => useTour())
    expect(result.current.screen).toBe('mission')

    act(() => result.current.start('auto'))
    expect(driver.played).toEqual([{ ids: ['mission:guide', 'mission:terminal'], animate: true }])
    expect(useAppStore.getState().toursSeen).toEqual(['mission:guide', 'mission:terminal'])

    act(() => result.current.start('auto'))
    expect(driver.played).toHaveLength(1)

    act(() => result.current.start('replay'))
    expect(driver.played).toHaveLength(2)
  })

  it('points at a panel the first time the mission unlocks it, and never at a locked one', () => {
    const { result } = renderHook(() => useTour())
    act(() => result.current.start('auto'))
    driver.onScreen.add('#mission-topology')
    act(() => result.current.start('auto'))
    expect(driver.played[1]?.ids).toEqual(['mission:topology'])
    expect(driver.played.flatMap((tour) => tour.ids)).not.toContain('mission:editor')
  })

  it('never starts over an open dialog or another tour', () => {
    const { result } = renderHook(() => useTour())
    const dialog = document.body.appendChild(document.createElement('dialog'))
    dialog.setAttribute('open', '')
    act(() => result.current.start('replay'))
    dialog.remove()
    driver.active = true
    act(() => result.current.start('replay'))
    expect(driver.played).toEqual([])
  })

  it('draws without motion when the player turned it off', () => {
    useAppStore.getState().setMotion('reduce')
    const { result } = renderHook(() => useTour())
    act(() => result.current.start('replay'))
    expect(driver.played[0]?.animate).toBe(false)
  })

  it('forgets the stops seen, so every screen tours again', () => {
    useAppStore.getState().markToursSeen(['mission:guide'])
    const { result } = renderHook(() => useTour())
    act(() => result.current.resetSeen())
    expect(useAppStore.getState().toursSeen).toEqual([])
  })
})
