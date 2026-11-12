// @vitest-environment jsdom
import { useAppStore } from '@app/store'
import { act, cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { ThemeSync } from './ThemeSync'

afterEach(() => {
  cleanup()
  useAppStore.getState().resetSettings()
})

describe('ThemeSync', () => {
  it('puts the theme, motion and scale on the document root, and clears them for "system"', () => {
    render(<ThemeSync />)
    const root = document.documentElement
    act(() => {
      const store = useAppStore.getState()
      store.setTheme('dark')
      store.setMotion('reduce')
      store.setUiScale(1.25)
    })
    expect(root.dataset.theme).toBe('dark')
    expect(root.dataset.motion).toBe('reduce')
    expect(root.style.getPropertyValue('--ui-scale')).toBe('1.25')

    act(() => {
      useAppStore.getState().setTheme('system')
      useAppStore.getState().setMotion('system')
    })
    expect(root.dataset.theme).toBeUndefined()
    expect(root.dataset.motion).toBeUndefined()
  })
})
