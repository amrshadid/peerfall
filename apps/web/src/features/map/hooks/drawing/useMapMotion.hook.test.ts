// @vitest-environment jsdom
import { useAppStore } from '@app/store'
import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useMapMotion } from './useMapMotion.hook'

function stubSystemMotion(reduced: boolean) {
  vi.stubGlobal('matchMedia', () => ({
    matches: reduced,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }))
}

afterEach(() => {
  // Unmount first: a mounted hook would re-render on the reset without a matchMedia.
  cleanup()
  useAppStore.getState().resetSettings()
  vi.unstubAllGlobals()
})

describe('useMapMotion', () => {
  it('glides while neither the system nor the game asks for less motion', () => {
    stubSystemMotion(false)
    const { result } = renderHook(() => useMapMotion())
    expect(result.current).toBe(false)
  })

  it("jumps when the game's Motion setting says reduce", () => {
    stubSystemMotion(false)
    const { result } = renderHook(() => useMapMotion())
    act(() => useAppStore.getState().setMotion('reduce'))
    expect(result.current).toBe(true)
  })

  it('jumps when the system asks for less motion', () => {
    stubSystemMotion(true)
    const { result } = renderHook(() => useMapMotion())
    expect(result.current).toBe(true)
  })
})
