import type { StorageAdapter } from '@peerfall/core/types'
import { afterEach, describe, expect, it } from 'vitest'
import { hasStorage, readText, removeCopies, saveKey, writeAtomically } from '#services/utils/save-storage.service'
import { createFailingStorage, createMemoryStorage, installTestGame, uninstallTestGame } from '#test/index'
import { NEXT_SUFFIX, PREV_SUFFIX } from '#types/definitions/saves'

const KEY = saveKey('main')

/** Memory storage that refuses to write `key` itself, like a tab closed between two writes. */
function storageFailingOn(key: string) {
  const memory = createMemoryStorage()
  const storage: StorageAdapter = {
    ...memory,
    setItem: async (name, value) => {
      if (name === key) {
        throw new Error('the tab closed')
      }
      await memory.setItem(name, value)
    },
  }
  return { memory, storage }
}

describe('saveKey', () => {
  it('keys each slot under the profile key', () => {
    expect(saveKey('main')).toBe('peerfall:v1:profile:main')
    expect(saveKey('backup')).toBe('peerfall:v1:profile:backup')
  })
})

describe('save storage', () => {
  afterEach(uninstallTestGame)

  it('with no storage reads nothing, removes nothing and refuses to write', async () => {
    installTestGame({ storage: null })
    expect(hasStorage()).toBe(false)
    expect(await readText(KEY)).toBeNull()
    await expect(removeCopies(KEY)).resolves.toBeUndefined()
    await expect(writeAtomically(KEY, 'new')).rejects.toThrow('No storage')
  })

  it('reads stored text, and null for a missing key', async () => {
    installTestGame({ storage: createMemoryStorage({ [KEY]: 'saved' }) })
    expect(await readText(KEY)).toBe('saved')
    expect(await readText(KEY + PREV_SUFFIX)).toBeNull()
  })

  it("reads null from storage that can't be read, instead of throwing", async () => {
    installTestGame({ storage: createFailingStorage() })
    expect(await readText(KEY)).toBeNull()
  })

  it('writes atomically: the new save is the main copy, the old one .prev, and no .next is left', async () => {
    const { storage } = installTestGame()
    await writeAtomically(KEY, 'first')
    expect([...storage.map.entries()]).toEqual([[KEY, 'first']])

    await writeAtomically(KEY, 'second')
    expect(storage.map.get(KEY)).toBe('second')
    expect(storage.map.get(KEY + PREV_SUFFIX)).toBe('first')
    expect(storage.map.has(KEY + NEXT_SUFFIX)).toBe(false)
  })

  it('leaves the last good copy readable, and no stray .next, when writing the main copy fails', async () => {
    const { memory, storage } = storageFailingOn(KEY)
    memory.map.set(KEY, 'good')
    installTestGame({ storage })

    await expect(writeAtomically(KEY, 'new')).rejects.toThrow('the tab closed')
    expect(memory.map.get(KEY)).toBe('good')
    expect(memory.map.has(KEY + NEXT_SUFFIX)).toBe(false)
  })

  it('reports the failed write even when storage refuses to remove .next', async () => {
    installTestGame({ storage: createFailingStorage() })
    await expect(writeAtomically(KEY, 'new')).rejects.toThrow()
  })

  it('removes the main copy, .prev and a stray .next', async () => {
    const storage = createMemoryStorage({ [KEY]: 'a', [KEY + PREV_SUFFIX]: 'b', [KEY + NEXT_SUFFIX]: 'c', other: 'd' })
    installTestGame({ storage })

    await removeCopies(KEY)
    expect([...storage.map.keys()]).toEqual(['other'])
  })

  it("doesn't throw when storage refuses to remove: the next save overwrites the copy", async () => {
    installTestGame({ storage: createFailingStorage() })
    await expect(removeCopies(KEY)).resolves.toBeUndefined()
  })
})
