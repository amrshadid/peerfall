import { eventBus } from '@peerfall/core/services'
import { afterEach, describe, expect, it } from 'vitest'
import { cleanupGameListeners } from '#events/listeners'
import { GAME_EVENTS } from '#events/types'
import { settleSaves } from '#services/utils/save-queue.service'
import { saveKey } from '#services/utils/save-storage.service'
import { installTestGame, uninstallTestGame } from '#test/index'
import { DEFAULT_SAVE_SLOT } from '#types/definitions/saves'

const KEY = saveKey(DEFAULT_SAVE_SLOT)

const changed = () => eventBus.emit(GAME_EVENTS.PROGRESS_CHANGED, { at: 0 }, { source: 'game/test' })

describe('game listeners', () => {
  afterEach(uninstallTestGame)

  it('autosaves when progress changes', async () => {
    const { storage } = installTestGame()
    changed()
    await settleSaves()
    expect(storage.map.has(KEY)).toBe(true)
  })

  it('writes nothing when autosave is off', async () => {
    const { storage } = installTestGame({ options: { autosave: false } })
    changed()
    await settleSaves()
    expect(storage.map.has(KEY)).toBe(false)
  })

  it('stops autosaving after cleanup', async () => {
    const { storage } = installTestGame()
    cleanupGameListeners()
    changed()
    await settleSaves()
    expect(storage.map.has(KEY)).toBe(false)
  })
})
