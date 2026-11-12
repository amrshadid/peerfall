import { STORAGE_KEYS } from '@peerfall/core/types'
import type { TextStorage } from '@shared/types'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { memoryStorage, storageAdapter, writableLocalStorage } from './storage.util'

/** A text store whose writes throw like a full origin once `full` is set. */
function quotaStorage(): TextStorage & { full: boolean } {
  const items = memoryStorage()
  return {
    full: false,
    getItem: (key) => items.getItem(key),
    setItem(key, value) {
      if (this.full) {
        throw new DOMException('full', 'QuotaExceededError')
      }
      items.setItem(key, value)
    },
    removeItem: (key) => items.removeItem(key),
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('storageAdapter', () => {
  it('reads, writes and removes through the text store', async () => {
    const adapter = storageAdapter(memoryStorage())
    expect(await adapter.getItem('a')).toBeNull()
    await adapter.setItem('a', 'one')
    expect(await adapter.getItem('a')).toBe('one')
    await adapter.removeItem('a')
    expect(await adapter.getItem('a')).toBeNull()
  })

  it('rejects a refused write and keeps what was stored before', async () => {
    const text = quotaStorage()
    const adapter = storageAdapter(text)
    await adapter.setItem('save', 'old')
    text.full = true
    await expect(adapter.setItem('save', 'new')).rejects.toMatchObject({ name: 'QuotaExceededError' })
    expect(await adapter.getItem('save')).toBe('old')
  })
})

describe('memoryStorage', () => {
  it('keeps values apart per store', () => {
    const one = memoryStorage()
    const two = memoryStorage()
    one.setItem('k', 'v')
    expect(one.getItem('k')).toBe('v')
    expect(two.getItem('k')).toBeNull()
  })
})

describe('writableLocalStorage', () => {
  it('probes with the shared probe key and leaves nothing behind', () => {
    const local = memoryStorage()
    const setItem = vi.spyOn(local, 'setItem')
    vi.stubGlobal('localStorage', local)
    expect(writableLocalStorage()).toBe(local)
    expect(setItem).toHaveBeenCalledWith(STORAGE_KEYS.STORAGE_PROBE, '1')
    expect(local.getItem(STORAGE_KEYS.STORAGE_PROBE)).toBeNull()
  })

  it('gives null when the browser refuses the first write', () => {
    const local = quotaStorage()
    local.full = true
    vi.stubGlobal('localStorage', local)
    expect(writableLocalStorage()).toBeNull()
  })

  it('gives null when localStorage is missing altogether', () => {
    vi.stubGlobal('localStorage', undefined)
    expect(writableLocalStorage()).toBeNull()
  })
})

describe('pageTextStorage', () => {
  it("probes the page's storage on first use, not at import, and writes through to it", async () => {
    vi.resetModules()
    const local = memoryStorage()
    const { pageTextStorage } = await import('./storage.util')
    vi.stubGlobal('localStorage', local)
    pageTextStorage.setItem('k', 'v')
    expect(local.getItem('k')).toBe('v')
    pageTextStorage.removeItem('k')
    expect(pageTextStorage.getItem('k')).toBeNull()
  })
})
