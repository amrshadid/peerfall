import type { Notice } from '@features/notices/types'
import { DEFAULT_SETTINGS, SETTINGS_VERSION } from '@shared/utils/settings'
import { afterEach, describe, expect, it } from 'vitest'
import { useAppStore } from './store'

const stored = () => useAppStore.persist.getOptions().partialize?.(useAppStore.getState())

const notice = (id: string, kind: Notice['kind'] = 'info'): Notice => ({
  id,
  kind,
  kicker: 'Note',
  text: id,
  sticky: kind === 'save-failed',
})

afterEach(() => {
  useAppStore.getState().resetSettings()
  for (const { id } of useAppStore.getState().notices) {
    useAppStore.getState().dismissNotice(id)
  }
})

describe('useAppStore', () => {
  it('applies setting changes and resets to the defaults', () => {
    const store = useAppStore.getState()
    store.setTheme('light')
    store.setShowAllPanels(true)
    expect(useAppStore.getState()).toMatchObject({ theme: 'light', showAllPanels: true })
    useAppStore.getState().resetSettings()
    expect(useAppStore.getState()).toMatchObject(DEFAULT_SETTINGS)
  })

  it('remembers tour stops once each, in the order they were first shown', () => {
    useAppStore.getState().markToursSeen(['title:start', 'title:contents'])
    useAppStore.getState().markToursSeen(['title:contents', 'mission:guide'])
    expect(useAppStore.getState().toursSeen).toEqual(['title:start', 'title:contents', 'mission:guide'])
    expect(stored()).toMatchObject({ toursSeen: ['title:start', 'title:contents', 'mission:guide'] })
    useAppStore.getState().resetToursSeen()
    expect(useAppStore.getState().toursSeen).toEqual([])
  })

  it('keeps a dragged panel size inside its limits, and null puts the default back', () => {
    useAppStore.getState().setPanelSize('guide', 24)
    expect(useAppStore.getState().panelSizes.guide).toBe(24)
    useAppStore.getState().setPanelSize('guide', 500)
    expect(useAppStore.getState().panelSizes.guide).toBeNull()
    useAppStore.getState().setPanelSize('network', 30)
    useAppStore.getState().setPanelSize('network', null)
    expect(useAppStore.getState().panelSizes.network).toBeNull()
  })

  it('stores the settings under the current version and reads older ones field by field', () => {
    const options = useAppStore.persist.getOptions()
    expect(options.version).toBe(SETTINGS_VERSION)
    expect(options.migrate?.({ theme: 'dark', gone: 1 }, 0)).toEqual({ ...DEFAULT_SETTINGS, theme: 'dark' })
  })

  it('lets the latest shortcut registration win and hands the key back when it leaves', () => {
    const first = () => {}
    const second = () => {}
    const { registerShortcut, unregisterShortcut } = useAppStore.getState()
    registerShortcut('hint', first)
    registerShortcut('hint', second)
    expect(useAppStore.getState().shortcutHandlers.hint).toBe(second)

    // The screen registered first unmounting must not take the key from the one on top.
    unregisterShortcut('hint', first)
    expect(useAppStore.getState().shortcutHandlers.hint).toBe(second)

    unregisterShortcut('hint', second)
    expect(useAppStore.getState().shortcutHandlers.hint).toBeUndefined()
    expect(stored()).not.toHaveProperty('shortcutHandlers')
  })

  it('keeps the cheat sheet state out of the stored settings', () => {
    useAppStore.getState().openCheatSheet()
    expect(useAppStore.getState().cheatSheetOpen).toBe(true)
    expect(stored()).not.toHaveProperty('cheatSheetOpen')
    useAppStore.getState().closeCheatSheet()
  })

  it('queues notices for this tab only, and drops one when it is dismissed', () => {
    useAppStore.getState().showNotice(notice('a'))
    useAppStore.getState().showNotice(notice('b'))
    expect(useAppStore.getState().notices.map((each) => each.id)).toEqual(['a', 'b'])
    useAppStore.getState().dismissNotice('a')
    expect(useAppStore.getState().notices.map((each) => each.id)).toEqual(['b'])
    expect(stored()).not.toHaveProperty('notices')
  })
})
