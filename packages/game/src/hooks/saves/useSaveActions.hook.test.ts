import { eventBus } from '@peerfall/core/services'
import { afterEach, describe, expect, it } from 'vitest'
import { GAME_EVENTS } from '#events/types'
import { createMissionActions } from '#hooks/mission/useMissionActions.hook'
import { createSaveActions } from '#hooks/saves/useSaveActions.hook'
import { saveKey } from '#services/utils/save-storage.service'
import { useProgressStore } from '#store/progress.store'
import {
  bfdBothEndsRun,
  createFailingStorage,
  createMemoryStorage,
  EXAMPLE_MISSION,
  installTestGame,
  uninstallTestGame,
} from '#test/index'
import { DEFAULT_SAVE_SLOT, PREV_SUFFIX, SAVE_ISSUES, SAVE_VERSION } from '#types/definitions/saves'
import { GAME_STATUS } from '#types/definitions/store'
import { emptyProgress, isCompleted } from '#utils/progress/index'
import { toSaveFile } from '#utils/saves/index'

const state = useProgressStore.getState
const KEY = saveKey(DEFAULT_SAVE_SLOT)
const ID = EXAMPLE_MISSION.id

/** Plays the example mission to completion. */
async function completeMission() {
  const mission = createMissionActions()
  await mission.start(ID)
  await mission.submitRun(bfdBothEndsRun())
}

function recordOpened() {
  const issues: unknown[] = []
  const subscription = eventBus.on<{ saveIssue: unknown }>(GAME_EVENTS.OPENED, (event) => {
    issues.push(event.payload.saveIssue)
  })
  return { issues, stop: subscription.unsubscribe }
}

describe('save actions', () => {
  afterEach(uninstallTestGame)

  it('opens a fresh game from empty storage', async () => {
    installTestGame()
    const opened = recordOpened()
    expect(await createSaveActions().open()).toEqual({ success: true, data: emptyProgress() })
    expect(state()).toMatchObject({ status: GAME_STATUS.open, saveIssue: null, lastSavedAt: null })
    expect(opened.issues).toEqual([null])
    opened.stop()
  })

  it('autosaves every step, so a reopened game is where it was left', async () => {
    const { storage, clock } = installTestGame()
    const saves = createSaveActions()
    await saves.open()
    await completeMission()
    const played = state().progress

    installTestGame({ storage, clock })
    expect(state().progress).toEqual(emptyProgress())
    await saves.open()
    expect(state().progress).toEqual(played)
    expect(isCompleted(state().progress, ID)).toBe(true)
    expect(state().active).toBeNull()
  })

  it('keeps the last good copy as .prev and falls back to it', async () => {
    const { storage } = installTestGame()
    const saves = createSaveActions()
    await saves.open()
    await completeMission()
    expect(storage.map.has(KEY + PREV_SUFFIX)).toBe(true)

    storage.map.set(KEY, '{"format":"peerfall-save","version":')
    expect((await saves.open()).success).toBe(true)
    expect(state().progress.lastActive).toBe(ID)
  })

  it('refuses a save from a newer game and never overwrites it: the session plays in memory', async () => {
    const newer = JSON.stringify({ ...toSaveFile(emptyProgress(), 9), version: SAVE_VERSION + 1 })
    const storage = createMemoryStorage({ [KEY]: newer })
    installTestGame({ storage })
    const saves = createSaveActions()
    const opened = recordOpened()

    const result = await saves.open()
    expect(result).toMatchObject({ success: false, error: { code: 'VALIDATION_ERROR' } })
    expect(result.error?.message).toMatch(/newer version/)
    expect(state()).toMatchObject({ status: GAME_STATUS.open, saveIssue: SAVE_ISSUES.unreadable })
    expect(opened.issues).toEqual([SAVE_ISSUES.unreadable])

    await completeMission()
    expect(isCompleted(state().progress, ID)).toBe(true)
    expect(await saves.saveNow()).toMatchObject({ success: false, error: { details: SAVE_ISSUES.unreadable } })
    expect([...storage.map.entries()]).toEqual([[KEY, newer]])
    opened.stop()
  })

  it('never overwrites a save it cannot read either', async () => {
    const storage = createMemoryStorage({ [KEY]: 'not a save' })
    installTestGame({ storage })
    const saves = createSaveActions()
    expect((await saves.open()).success).toBe(false)
    await completeMission()
    expect(storage.map.get(KEY)).toBe('not a save')
  })

  it('stays playable in memory with no storage, and offers the progress as an export', async () => {
    installTestGame({ storage: null })
    const saves = createSaveActions()
    const opened = recordOpened()

    expect((await saves.open()).success).toBe(true)
    expect(state().saveIssue).toBe(SAVE_ISSUES.noStorage)
    expect(opened.issues).toEqual([SAVE_ISSUES.noStorage])

    await completeMission()
    expect(isCompleted(state().progress, ID)).toBe(true)
    expect(state().saveIssue).toBe(SAVE_ISSUES.noStorage)
    expect(await saves.saveNow()).toMatchObject({ success: false, error: { code: 'UNAVAILABLE' } })

    const exported = saves.exportSave()
    installTestGame()
    await saves.open()
    expect((await saves.importSave(exported)).success).toBe(true)
    expect(isCompleted(state().progress, ID)).toBe(true)
    opened.stop()
  })

  it('keeps playing when storage refuses writes, and says why saving fails', async () => {
    installTestGame({ storage: createFailingStorage('quota exceeded') })
    const saves = createSaveActions()
    await saves.open()
    await completeMission()
    expect(isCompleted(state().progress, ID)).toBe(true)
    expect(state().saveIssue).toBe(SAVE_ISSUES.writeFailed)
    expect(await saves.saveNow()).toMatchObject({ success: false, error: { details: SAVE_ISSUES.writeFailed } })
  })

  it('imports a chosen save over one it could not read, closes the active mission and stores it', async () => {
    installTestGame()
    const saves = createSaveActions()
    await saves.open()
    await completeMission()
    const exported = saves.exportSave()

    const storage = createMemoryStorage({ [KEY]: 'not a save' })
    installTestGame({ storage })
    await saves.open()
    await createMissionActions().start(ID)

    expect(await saves.importSave(exported)).toMatchObject({ success: true, data: { migratedFrom: null } })
    expect(state()).toMatchObject({ active: null, saveIssue: null })
    expect(isCompleted(state().progress, ID)).toBe(true)
    expect(JSON.parse(storage.map.get(KEY) ?? '{}').progress).toEqual(state().progress)
  })

  it('refuses to import what is not a save, with every problem, and changes nothing', async () => {
    installTestGame()
    const saves = createSaveActions()
    await saves.open()
    await completeMission()
    const before = state().progress

    expect(await saves.importSave('{"hello": 1}')).toMatchObject({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'not a Peerfall save', details: ['not a Peerfall save'] },
    })
    expect(state().progress).toBe(before)
  })

  it('drops a save that finished loading after an import', async () => {
    installTestGame()
    const saves = createSaveActions()
    await saves.open()
    await completeMission()
    const exported = saves.exportSave()

    installTestGame()
    const opening = saves.open()
    await saves.importSave(exported)
    await opening
    expect(isCompleted(state().progress, ID)).toBe(true)
  })

  it('resets the progress and removes every stored copy', async () => {
    const { storage } = installTestGame()
    const saves = createSaveActions()
    await saves.open()
    await completeMission()
    let resets = 0
    const subscription = eventBus.on(GAME_EVENTS.PROGRESS_RESET, () => {
      resets++
    })

    expect((await saves.reset()).success).toBe(true)
    expect(state()).toMatchObject({ progress: emptyProgress(), active: null, saveIssue: null, lastSavedAt: null })
    expect(storage.map.size).toBe(0)
    expect(resets).toBe(1)
    subscription.unsubscribe()
  })
})
