import { STORAGE_KEYS } from '@peerfall/core/types'
import { memoryStorage } from '@shared/utils/storage'
import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS, SETTINGS_VERSION } from './settings.constants'
import { settingsStorage } from './settings-storage.util'

const KEY = STORAGE_KEYS.SETTINGS

describe('settingsStorage', () => {
  it('reads a bare settings object as version 0', () => {
    const text = memoryStorage()
    text.setItem(KEY, JSON.stringify({ theme: 'dark', uiScale: 1.25 }))
    expect(settingsStorage(text).getItem(KEY)).toEqual({
      state: { ...DEFAULT_SETTINGS, theme: 'dark', uiScale: 1.25 },
      version: 0,
    })
  })

  it('round-trips a versioned value and defaults invalid fields', () => {
    const text = memoryStorage()
    const storage = settingsStorage(text)
    storage.setItem(KEY, { state: { ...DEFAULT_SETTINGS, motion: 'reduce' }, version: SETTINGS_VERSION })
    expect(storage.getItem(KEY)).toEqual({
      state: { ...DEFAULT_SETTINGS, motion: 'reduce' },
      version: SETTINGS_VERSION,
    })

    text.setItem(KEY, JSON.stringify({ state: { uiScale: 9 }, version: 1 }))
    expect(storage.getItem(KEY)).toMatchObject({ state: { uiScale: DEFAULT_SETTINGS.uiScale } })
  })

  it('gives nothing for unreadable JSON', () => {
    const text = memoryStorage()
    text.setItem(KEY, '{oops')
    expect(settingsStorage(text).getItem(KEY)).toBeNull()
  })

  it('keeps the settings for this tab when the browser refuses the write', () => {
    const storage = settingsStorage({
      getItem: () => null,
      setItem: () => {
        throw new DOMException('full', 'QuotaExceededError')
      },
      removeItem: () => {},
    })
    expect(() => storage.setItem(KEY, { state: DEFAULT_SETTINGS, version: SETTINGS_VERSION })).not.toThrow()
  })
})
