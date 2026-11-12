import type { StorageAdapter } from '@peerfall/core/types'
import { afterEach, describe, expect, it } from 'vitest'
import { queueRemove, queueSave, settleSaves } from '#services/utils/save-queue.service'
import { saveKey } from '#services/utils/save-storage.service'
import { createMemoryStorage, installTestGame, uninstallTestGame } from '#test/index'
import { DEFAULT_SAVE_SLOT, SAVE_ISSUES } from '#types/definitions/saves'
import { emptyProgress } from '#utils/progress/index'
import { toSaveFile } from '#utils/saves/index'

const SLOT = DEFAULT_SAVE_SLOT
const KEY = saveKey(SLOT)
const FIRST_AT = 1_000
const SECOND_AT = 1_500

const fileAt = (savedAt: number) => toSaveFile(emptyProgress(), savedAt)

/** Memory storage that logs every write and can be told to refuse the next one. */
function loggedStorage() {
  const memory = createMemoryStorage()
  const log: string[] = []
  let refuseNext = false
  const storage: StorageAdapter = {
    ...memory,
    setItem: async (key, value) => {
      if (refuseNext) {
        refuseNext = false
        throw new Error('quota exceeded')
      }
      log.push(`${key} = ${JSON.parse(value).savedAt}`)
      await memory.setItem(key, value)
    },
  }
  const refuseNextWrite = () => {
    refuseNext = true
  }
  return { memory, storage, log, refuseNextWrite }
}

describe('save queue', () => {
  afterEach(uninstallTestGame)

  it('resolves with when the file was saved', async () => {
    const { storage } = installTestGame()
    expect(await queueSave(SLOT, fileAt(FIRST_AT))).toEqual({ savedAt: FIRST_AT, issue: null })
    expect(JSON.parse(storage.map.get(KEY) ?? '').savedAt).toBe(FIRST_AT)
  })

  it('lands writes one after another, in the order they were made', async () => {
    const { storage, log } = loggedStorage()
    installTestGame({ storage })
    void queueSave(SLOT, fileAt(FIRST_AT))
    void queueSave(SLOT, fileAt(SECOND_AT))

    await settleSaves()
    // The second write starts only after the first has finished, so it keeps the first as .prev.
    expect(log).toEqual([
      `${KEY}.next = ${FIRST_AT}`,
      `${KEY} = ${FIRST_AT}`,
      `${KEY}.next = ${SECOND_AT}`,
      `${KEY}.prev = ${FIRST_AT}`,
      `${KEY} = ${SECOND_AT}`,
    ])
  })

  it("reports a refused write, and the failure doesn't block the next one", async () => {
    const { storage, refuseNextWrite } = loggedStorage()
    installTestGame({ storage })

    refuseNextWrite()
    expect(await queueSave(SLOT, fileAt(FIRST_AT))).toEqual({ savedAt: null, issue: SAVE_ISSUES.writeFailed })
    expect(await queueSave(SLOT, fileAt(SECOND_AT))).toEqual({ savedAt: SECOND_AT, issue: null })
  })

  it('deletes the slot after the writes queued before it', async () => {
    const { storage } = installTestGame()
    await queueSave(SLOT, fileAt(FIRST_AT))
    void queueSave(SLOT, fileAt(SECOND_AT))
    await queueRemove(SLOT)

    expect(storage.map.size).toBe(0)
  })

  it('settles after the callers awaiting the last write have run', async () => {
    installTestGame()
    const order: string[] = []
    void queueSave(SLOT, fileAt(FIRST_AT)).then(() => order.push('caller'))

    await settleSaves()
    expect(order).toEqual(['caller'])
  })
})
