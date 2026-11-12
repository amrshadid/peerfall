import { STORAGE_KEYS, type StorageAdapter } from '@peerfall/core/types'
import type { TextStorage } from '@shared/types'

export interface PageStorage {
  readonly text: TextStorage
  /** False when the browser won't let the page store anything: progress lasts for this tab only. */
  readonly persistent: boolean
}

/** Private windows and blocked site data throw on access or on the first write, so probe with one. */
export function writableLocalStorage(): Storage | null {
  try {
    const storage = globalThis.localStorage
    storage.setItem(STORAGE_KEYS.STORAGE_PROBE, '1')
    storage.removeItem(STORAGE_KEYS.STORAGE_PROBE)
    return storage
  } catch {
    return null
  }
}

export function memoryStorage(): TextStorage {
  const items = new Map<string, string>()
  return {
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => {
      items.set(key, value)
    },
    removeItem: (key) => {
      items.delete(key)
    },
  }
}

/** A refused write rejects, so the game keeps progress in memory and says so; it never deletes to make room. */
export function storageAdapter(text: TextStorage): StorageAdapter {
  return {
    getItem: async (key) => text.getItem(key),
    setItem: async (key, value) => text.setItem(key, value),
    removeItem: async (key) => text.removeItem(key),
  }
}

let page: PageStorage | null = null

/** Probed once; memory when the browser refuses localStorage. */
export function pageStorage(): PageStorage {
  if (page === null) {
    const local = writableLocalStorage()
    page = { text: local ?? memoryStorage(), persistent: local !== null }
  }
  return page
}

/** Reads through on every call, so the page's storage is probed on first use, not at import. */
export const pageTextStorage: TextStorage = {
  getItem: (key) => pageStorage().text.getItem(key),
  setItem: (key, value) => pageStorage().text.setItem(key, value),
  removeItem: (key) => pageStorage().text.removeItem(key),
}
