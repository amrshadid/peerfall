import { saveApi } from '#services/api/save.api'
import type { SaveFile, SaveOutcome, SaveSlot } from '#types/definitions/saves'
import { SAVE_ISSUES } from '#types/definitions/saves'

// Writes land in the order they were made; a failed one doesn't block the next.
let queue: Promise<unknown> = Promise.resolve()

/** Never deletes progress to make room: a refused write reports `write_failed` and the game plays on from memory. */
export function queueSave(slot: SaveSlot, file: SaveFile): Promise<SaveOutcome> {
  const outcome = queue.then(async (): Promise<SaveOutcome> => {
    const written = await saveApi.write(slot, file)
    return written.success ? { savedAt: file.savedAt, issue: null } : { savedAt: null, issue: SAVE_ISSUES.writeFailed }
  })
  queue = outcome
  return outcome
}

export function queueRemove(slot: SaveSlot): Promise<void> {
  const removed = queue.then(async () => {
    await saveApi.remove(slot)
  })
  queue = removed
  return removed
}

/** Resolves after the callers awaiting the last write, since they subscribed to it first. */
export async function settleSaves(): Promise<void> {
  await queue
}
