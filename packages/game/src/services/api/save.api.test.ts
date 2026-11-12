import { afterEach, describe, expect, it } from 'vitest'
import { saveApi } from '#services/api/save.api'
import { saveKey } from '#services/utils/save-storage.service'
import { createFailingStorage, installTestGame, uninstallTestGame } from '#test/index'
import { DEFAULT_SAVE_SLOT, PREV_SUFFIX, SAVE_VERSION } from '#types/definitions/saves'
import { emptyProgress } from '#utils/progress/index'
import { toSaveFile } from '#utils/saves/index'

const SLOT = DEFAULT_SAVE_SLOT
const KEY = saveKey(SLOT)
const CORRUPT = '{"format":"peerfall-save","version":'

describe('saveApi', () => {
  afterEach(uninstallTestGame)

  it('keys the slot under the profile storage key', () => {
    expect(KEY).toBe('peerfall:v1:profile:main')
  })

  it('loads a fresh game and refuses to write when the app has no storage', async () => {
    installTestGame({ storage: null })
    expect(await saveApi.load(SLOT)).toMatchObject({ success: true, data: { savedAt: null } })
    expect(await saveApi.write(SLOT, toSaveFile(emptyProgress(), 1))).toMatchObject({
      success: false,
      error: { code: 'UNAVAILABLE' },
    })
    expect((await saveApi.remove(SLOT)).success).toBe(true)
  })

  it('loads an empty slot as a fresh game', async () => {
    installTestGame()
    const loaded = await saveApi.load(SLOT)
    expect(loaded).toMatchObject({ success: true, data: { savedAt: null } })
  })

  it('writes atomically: the new save is the main copy and the old one is kept as .prev', async () => {
    const { storage } = installTestGame()
    await saveApi.write(SLOT, toSaveFile(emptyProgress(), 1))
    await saveApi.write(SLOT, toSaveFile(emptyProgress(), 2))

    expect(JSON.parse(storage.map.get(KEY) ?? '').savedAt).toBe(2)
    expect(JSON.parse(storage.map.get(KEY + PREV_SUFFIX) ?? '').savedAt).toBe(1)
    expect([...storage.map.keys()].sort()).toEqual([KEY, KEY + PREV_SUFFIX])
  })

  it('falls back to the .prev copy when the main one is corrupt', async () => {
    const { storage } = installTestGame()
    storage.map.set(KEY, CORRUPT)
    storage.map.set(KEY + PREV_SUFFIX, JSON.stringify(toSaveFile(emptyProgress(), 7)))

    const loaded = await saveApi.load(SLOT)
    expect(loaded).toMatchObject({ success: true, data: { savedAt: 7 } })
  })

  it('refuses a save from a newer version and never replaces it with the older .prev', async () => {
    const { storage } = installTestGame()
    storage.map.set(KEY, JSON.stringify({ ...toSaveFile(emptyProgress(), 9), version: SAVE_VERSION + 1 }))
    storage.map.set(KEY + PREV_SUFFIX, JSON.stringify(toSaveFile(emptyProgress(), 7)))

    const loaded = await saveApi.load(SLOT)
    expect(loaded.success).toBe(false)
    expect(loaded.error?.code).toBe('VALIDATION_ERROR')
    expect(loaded.error?.message).toMatch(/newer version/)
  })

  it('fails with every problem in details when both copies are unreadable', async () => {
    const { storage } = installTestGame()
    storage.map.set(KEY, CORRUPT)
    storage.map.set(KEY + PREV_SUFFIX, CORRUPT)

    const loaded = await saveApi.load(SLOT)
    expect(loaded.error?.code).toBe('VALIDATION_ERROR')
    expect(Array.isArray(loaded.error?.details)).toBe(true)
  })

  it('reports storage that refuses a write as UNAVAILABLE', async () => {
    installTestGame({ storage: createFailingStorage('quota exceeded') })
    const written = await saveApi.write(SLOT, toSaveFile(emptyProgress(), 1))
    expect(written).toMatchObject({ success: false, error: { code: 'UNAVAILABLE', message: 'quota exceeded' } })
  })

  it('removes the slot and its copies', async () => {
    const { storage } = installTestGame()
    await saveApi.write(SLOT, toSaveFile(emptyProgress(), 1))
    await saveApi.write(SLOT, toSaveFile(emptyProgress(), 2))
    expect((await saveApi.remove(SLOT)).success).toBe(true)
    expect(storage.map.size).toBe(0)
  })
})
