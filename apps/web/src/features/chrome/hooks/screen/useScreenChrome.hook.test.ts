// @vitest-environment jsdom
import { cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useScreenChrome } from './useScreenChrome.hook'

const state = vi.hoisted(() => ({
  isDark: false,
  screen: null as string | null,
  start: (_mode: string) => {},
  toggleTheme: () => {},
  onExport: () => {},
}))

vi.mock('@app/theme', () => ({ useTheme: () => ({ isDark: state.isDark, toggleTheme: state.toggleTheme }) }))
vi.mock('@features/chrome/hooks/save', () => ({
  useExportSave: () => state.onExport,
  useSaveStatus: () => ({ storageIssue: 'private' }),
}))
vi.mock('@features/tour/hooks/tour', () => ({ useTour: () => ({ screen: state.screen, start: state.start }) }))

beforeEach(() => {
  state.isDark = false
  state.screen = null
  state.start = vi.fn()
})

afterEach(() => {
  cleanup()
})

describe('useScreenChrome', () => {
  it('names the print the theme button switches to', () => {
    expect(renderHook(() => useScreenChrome()).result.current.themeLabel).toBe('Night print')
    state.isDark = true
    expect(renderHook(() => useScreenChrome()).result.current.themeLabel).toBe('Day print')
  })

  it('passes the storage issue and the save export through', () => {
    const { result } = renderHook(() => useScreenChrome())
    expect(result.current.storageIssue).toBe('private')
    expect(result.current.onExport).toBe(state.onExport)
    expect(result.current.onToggleTheme).toBe(state.toggleTheme)
  })

  it('offers a tour replay only on a screen that has a tour', () => {
    expect(renderHook(() => useScreenChrome()).result.current.onTour).toBeNull()
    state.screen = 'map'
    renderHook(() => useScreenChrome()).result.current.onTour?.()
    expect(state.start).toHaveBeenCalledWith('replay')
  })
})
