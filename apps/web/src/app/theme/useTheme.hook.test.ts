// @vitest-environment jsdom
import { useAppStore } from '@app/store'
import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useTheme } from './useTheme.hook'

function systemPrefersDark(dark: boolean): void {
  vi.stubGlobal('matchMedia', () => ({
    matches: dark,
    addEventListener: () => {},
    removeEventListener: () => {},
  }))
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  useAppStore.getState().resetSettings()
})

describe('useTheme', () => {
  it('follows the system until the player picks a print', () => {
    systemPrefersDark(true)
    const { result } = renderHook(() => useTheme())
    expect(result.current.isDark).toBe(true)
    act(() => result.current.toggleTheme())
    expect(useAppStore.getState().theme).toBe('light')
    expect(result.current.isDark).toBe(false)
  })

  it('switches a chosen Day print to Night print', () => {
    systemPrefersDark(false)
    useAppStore.getState().setTheme('light')
    const { result } = renderHook(() => useTheme())
    act(() => result.current.toggleTheme())
    expect(result.current.isDark).toBe(true)
  })
})
