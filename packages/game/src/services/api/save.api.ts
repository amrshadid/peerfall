import { handleServiceError } from '@peerfall/core/services'
import type { ServiceResponse, Validated } from '@peerfall/core/types'
import { handleStorageError, invalidSaveError } from '#services/utils/error-handling.service'
import { readText, removeCopies, saveKey, writeAtomically } from '#services/utils/save-storage.service'
import type { LoadedSave, SaveFile, SaveSlot } from '#types/definitions/saves'
import { PREV_SUFFIX } from '#types/definitions/saves'
import { parseJson, readSaveFile } from '#utils/saves/index'

const isNewerVersion = (result: Validated<LoadedSave>): boolean =>
  !result.ok && result.errors.some((error) => error.includes('newer version'))

const toResponse = (result: Validated<LoadedSave>): ServiceResponse<LoadedSave> =>
  result.ok ? { success: true, data: result.value } : invalidSaveError(result.errors)

/** The save slots in the injected storage. */
export const saveApi = {
  /** Falls back to `.prev` when the main copy is corrupt, but refuses a newer version rather than fall back. */
  load: async (slot: SaveSlot): Promise<ServiceResponse<LoadedSave>> => {
    try {
      const key = saveKey(slot)
      const main = await readText(key)
      const prev = await readText(key + PREV_SUFFIX)
      if (main === null && prev === null) {
        return toResponse(readSaveFile(undefined))
      }
      const first = readSaveFile(main === null ? undefined : parseJson(main))
      if (main !== null && (first.ok || isNewerVersion(first))) {
        return toResponse(first)
      }
      if (prev !== null) {
        const fallback = readSaveFile(parseJson(prev))
        if (fallback.ok || main === null) {
          return toResponse(fallback)
        }
      }
      return toResponse(first)
    } catch (error) {
      return handleServiceError(error)
    }
  },

  /** A crash mid-write leaves the last good copy readable. */
  write: async (slot: SaveSlot, file: SaveFile): Promise<ServiceResponse<void>> => {
    try {
      await writeAtomically(saveKey(slot), JSON.stringify(file))
      return { success: true }
    } catch (error) {
      return handleStorageError(error)
    }
  },

  remove: async (slot: SaveSlot): Promise<ServiceResponse<void>> => {
    try {
      await removeCopies(saveKey(slot))
      return { success: true }
    } catch (error) {
      return handleServiceError(error)
    }
  },
}
