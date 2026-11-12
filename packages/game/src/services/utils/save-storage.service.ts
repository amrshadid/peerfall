import { STORAGE_KEYS, type StorageAdapter } from '@peerfall/core/types'
import { getGameConfig } from '#config'
import type { SaveSlot } from '#types/definitions/saves'
import { NEXT_SUFFIX, PREV_SUFFIX } from '#types/definitions/saves'

export const saveKey = (slot: SaveSlot): string => `${STORAGE_KEYS.PROFILE}:${slot}`

/** Whether the app gave the game somewhere to keep saves; without it the game plays on in memory. */
export const hasStorage = (): boolean => getGameConfig().storage !== null

function requireStorage(): StorageAdapter {
  const { storage } = getGameConfig()
  if (!storage) {
    throw new Error('[@peerfall/game] No storage: the game is playing in memory.')
  }
  return storage
}

/** A stored text, or null when it is missing, storage can't be read or there is none. */
export async function readText(key: string): Promise<string | null> {
  try {
    return (await getGameConfig().storage?.getItem(key)) ?? null
  } catch {
    return null
  }
}

/**
 * The new save goes to `.next` first, so a full disk fails before the old copies
 * are touched, and the old one is kept as `.prev`. `.next` is only a staging
 * copy: it is removed whether the write succeeds or fails.
 */
export async function writeAtomically(key: string, json: string): Promise<void> {
  const storage = requireStorage()
  try {
    await storage.setItem(key + NEXT_SUFFIX, json)
    const current = await storage.getItem(key)
    if (current !== null) {
      await storage.setItem(key + PREV_SUFFIX, current)
    }
    await storage.setItem(key, json)
  } finally {
    await removeQuietly(key + NEXT_SUFFIX)
  }
}

export async function removeCopies(key: string): Promise<void> {
  for (const suffix of ['', NEXT_SUFFIX, PREV_SUFFIX]) {
    await removeQuietly(key + suffix)
  }
}

async function removeQuietly(key: string): Promise<void> {
  try {
    await getGameConfig().storage?.removeItem(key)
  } catch {
    // A copy that can't be removed is overwritten by the next save.
  }
}
