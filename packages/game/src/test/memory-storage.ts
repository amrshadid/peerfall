import type { StorageAdapter } from '@peerfall/core/types'

export interface MemoryStorage extends StorageAdapter {
  readonly map: Map<string, string>
}

export function createMemoryStorage(initial: Record<string, string> = {}): MemoryStorage {
  const map = new Map(Object.entries(initial))

  return {
    map,
    getItem: async (key) => map.get(key) ?? null,
    setItem: async (key, value) => void map.set(key, value),
    removeItem: async (key) => void map.delete(key),
  }
}

/** Storage that refuses everything, like a blocked or full localStorage. */
export function createFailingStorage(reason = 'storage unavailable'): StorageAdapter {
  const reject = async (): Promise<never> => {
    throw new Error(reason)
  }

  return { getItem: reject, setItem: reject, removeItem: reject }
}
