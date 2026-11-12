import { eventBus } from '@peerfall/core/services'
import type { StorageAdapter } from '@peerfall/core/types'
import { afterEach, describe, expect, it } from 'vitest'
import { GAME_EVENTS } from '#events/types'
import { saveProgress } from '#services/utils/save-progress.service'
import { saveKey } from '#services/utils/save-storage.service'
import { useProgressStore } from '#store/progress.store'
import { createMemoryStorage, EXAMPLE_MISSION, installTestGame, uninstallTestGame } from '#test/index'
import { DEFAULT_SAVE_SLOT, SAVE_ISSUES } from '#types/definitions/saves'
import { emptyProgress, startMission } from '#utils/progress/index'

const state = useProgressStore.getState
const KEY = saveKey(DEFAULT_SAVE_SLOT)

/** Memory storage that refuses its next write. */
function refusingOnce() {
  const memory = createMemoryStorage()
  let refuse = true
  const storage: StorageAdapter = {
    ...memory,
    setItem: async (key, value) => {
      if (refuse) {
        refuse = false
        throw new Error('quota exceeded')
      }
      await memory.setItem(key, value)
    },
  }
  return storage
}

/** Records game events emitted on the core bus, in order. */
function recordGameEvents() {
  const events: { type: string; payload: unknown }[] = []
  const subscription = eventBus.on('GAME_*', (event) => {
    events.push({ type: event.type, payload: event.payload })
  })
  return { events, stop: subscription.unsubscribe }
}

describe('saveProgress', () => {
  afterEach(uninstallTestGame)

  it('stamps the save with the clock, tracks it in the store and reports it', async () => {
    const { storage, clock } = installTestGame()
    const recorded = recordGameEvents()
    const progress = startMission(emptyProgress(), EXAMPLE_MISSION.id, clock.now())
    state().setProgress(progress)

    const written = saveProgress()
    expect(state().pendingSaves).toBe(1)
    await written

    expect(JSON.parse(storage.map.get(KEY) ?? '')).toMatchObject({ savedAt: clock.now(), progress })
    expect(state()).toMatchObject({ pendingSaves: 0, lastSavedAt: clock.now(), saveIssue: null })
    expect(recorded.events).toEqual([{ type: GAME_EVENTS.SAVED, payload: { at: clock.now() } }])
    recorded.stop()
  })

  it('keeps playing from memory when storage refuses, and a later write clears the issue', async () => {
    const { clock } = installTestGame({ storage: refusingOnce() })
    const recorded = recordGameEvents()

    await saveProgress()
    expect(state()).toMatchObject({ pendingSaves: 0, lastSavedAt: null, saveIssue: SAVE_ISSUES.writeFailed })
    expect(recorded.events).toEqual([
      { type: GAME_EVENTS.SAVE_FAILED, payload: { issue: SAVE_ISSUES.writeFailed, at: clock.now() } },
    ])

    await saveProgress()
    expect(state()).toMatchObject({ lastSavedAt: clock.now(), saveIssue: null })
    recorded.stop()
  })

  it('says there is no storage instead of pretending to save, and reports nothing', async () => {
    installTestGame({ storage: null })
    const recorded = recordGameEvents()

    await saveProgress()
    expect(state()).toMatchObject({ pendingSaves: 0, lastSavedAt: null, saveIssue: SAVE_ISSUES.noStorage })
    expect(recorded.events).toEqual([])
    recorded.stop()
  })

  it("never writes over a stored save the game couldn't read", async () => {
    const storage = createMemoryStorage({ [KEY]: 'unreadable' })
    installTestGame({ storage })
    state().open(emptyProgress(), null, SAVE_ISSUES.unreadable)

    await saveProgress()
    expect(storage.map.get(KEY)).toBe('unreadable')
    expect(state()).toMatchObject({ pendingSaves: 0, saveIssue: SAVE_ISSUES.unreadable })
  })
})
