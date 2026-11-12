import type { Settings, TextStorage } from '@shared/types'
import type { PersistStorage, StorageValue } from 'zustand/middleware'
import { readSettings } from './settings.util'

function isStorageValue(value: unknown): value is StorageValue<unknown> {
  return typeof value === 'object' && value !== null && 'state' in value && 'version' in value
}

/** Also reads the bare object written before version 1. */
export function settingsStorage(storage: TextStorage): PersistStorage<Settings> {
  return {
    getItem(name) {
      const text = storage.getItem(name)
      if (text === null) {
        return null
      }
      try {
        const value: unknown = JSON.parse(text)
        return isStorageValue(value)
          ? { state: readSettings(value.state), version: value.version ?? 0 }
          : { state: readSettings(value), version: 0 }
      } catch {
        return null
      }
    },
    setItem(name, value) {
      try {
        storage.setItem(name, JSON.stringify(value))
      } catch {
        // Settings are tiny; if even they can't be stored, they still apply to this tab.
      }
    },
    removeItem(name) {
      storage.removeItem(name)
    },
  }
}
