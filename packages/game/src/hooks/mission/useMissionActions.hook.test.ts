import { eventBus } from '@peerfall/core/services'
import { afterEach, describe, expect, it } from 'vitest'
import { configureGame, getGameConfig } from '#config'
import { GAME_EVENTS } from '#events/types'
import { revealHint } from '#hooks/hints/useHints.hook'
import { createMissionActions } from '#hooks/mission/useMissionActions.hook'
import { createSaveActions } from '#hooks/saves/useSaveActions.hook'
import { saveKey } from '#services/utils/save-storage.service'
import { useProgressStore } from '#store/progress.store'
import {
  baselineRun,
  bfdBothEndsRun,
  bfdOneEndRun,
  EXAMPLE_MISSION,
  exampleContent,
  FOLLOW_UP_MISSION,
  healthyRun,
  installTestGame,
  uninstallTestGame,
} from '#test/index'
import { DEFAULT_SAVE_SLOT } from '#types/definitions/saves'
import { findMissionProgress, missionStatus, savedComparison } from '#utils/progress/index'
import { readSaveFile } from '#utils/saves/index'

const state = useProgressStore.getState
const ID = EXAMPLE_MISSION.id
const KEY = saveKey(DEFAULT_SAVE_SLOT)

/** Records game events emitted on the core bus, in order. */
function recordGameEvents() {
  const events: { type: string; payload: unknown }[] = []
  const subscription = eventBus.on('GAME_*', (event) => {
    events.push({ type: event.type, payload: event.payload })
  })
  const of = (type: string) => events.filter((event) => event.type === type).map((event) => event.payload)
  return { events, of, stop: subscription.unsubscribe }
}

/** An open game with its flows, as a screen gets them from the hooks. */
async function openGame() {
  const game = installTestGame()
  const mission = createMissionActions()
  const saves = createSaveActions()
  await saves.open()
  return { ...game, mission, saves }
}

function storedProgress(raw: string | undefined) {
  const loaded = readSaveFile(raw === undefined ? undefined : JSON.parse(raw))
  if (!loaded.ok) {
    throw new Error(loaded.errors.join('\n'))
  }
  return loaded.value.progress
}

describe('mission actions', () => {
  afterEach(uninstallTestGame)

  it('starts a mission at its incident and says so', async () => {
    const { mission, clock } = await openGame()
    const recorded = recordGameEvents()

    const started = await mission.start(ID)

    expect(started).toMatchObject({
      success: true,
      data: { mission: EXAMPLE_MISSION, phase: 'incident', verdict: null },
    })
    expect(state().active?.mission).toBe(EXAMPLE_MISSION)
    expect(state().progress.lastActive).toBe(ID)
    expect(recorded.of(GAME_EVENTS.MISSION_STARTED)).toEqual([{ missionId: ID, resumed: false, at: clock.now() }])

    await mission.start(ID)
    expect(recorded.of(GAME_EVENTS.MISSION_STARTED)[1]).toMatchObject({ resumed: true })
    recorded.stop()
  })

  it('fails as a value for a mission that is unknown, locked, or not loaded', async () => {
    const { mission } = await openGame()
    expect(await mission.start('nope')).toMatchObject({ success: false, error: { code: 'NOT_FOUND' } })
    expect(await mission.start(FOLLOW_UP_MISSION.id)).toMatchObject({ success: false, error: { code: 'FORBIDDEN' } })
    expect(state().active).toBeNull()

    configureGame({ ...getGameConfig(), content: null })
    expect(await mission.start(ID)).toMatchObject({ success: false, error: { code: 'NOT_READY' } })
  })

  it('needs an active mission for everything else', async () => {
    const { mission } = await openGame()
    const expected = { success: false, error: { code: 'NOT_READY' } }
    expect(mission.begin()).toMatchObject(expected)
    expect(mission.judge(bfdBothEndsRun())).toMatchObject(expected)
    expect(await mission.saveBaseline(baselineRun())).toMatchObject(expected)
    expect(await mission.submitRun(bfdBothEndsRun())).toMatchObject(expected)
    expect(await mission.showDebrief()).toMatchObject(expected)
  })

  it('plays the mission through: baseline, a failed attempt, the repair, the debrief', async () => {
    const { mission, storage, clock } = await openGame()
    const recorded = recordGameEvents()
    await mission.start(ID)
    expect(mission.begin()).toMatchObject({ success: true, data: { phase: 'play' } })

    const baseline = await mission.saveBaseline(baselineRun())
    expect(baseline).toMatchObject({ success: true, data: { outage: { durationMs: 34_970 } } })
    expect(findMissionProgress(state().progress, ID)).toMatchObject({ attempts: 0, completedAt: null })
    expect(state().active?.verdict).toBeNull()

    clock.advance(60_000)
    const failed = await mission.submitRun(bfdOneEndRun())
    expect(failed).toMatchObject({ success: true, data: { passed: false } })
    expect(state().active?.verdict?.passed).toBe(false)
    expect(await mission.showDebrief()).toMatchObject({ success: false, error: { code: 'FORBIDDEN' } })
    expect(state().progress.debrief).toBeUndefined()
    expect(missionStatus(state().progress, FOLLOW_UP_MISSION, exampleContent())).toBe('locked')

    clock.advance(60_000)
    const completedAt = clock.now()
    const passed = await mission.submitRun(bfdBothEndsRun())
    expect(passed).toMatchObject({ success: true, data: { passed: true } })
    expect(findMissionProgress(state().progress, ID)).toMatchObject({ attempts: 2, completedAt })
    expect(missionStatus(state().progress, FOLLOW_UP_MISSION, exampleContent())).toBe('available')
    expect(savedComparison(state().progress, EXAMPLE_MISSION)?.outageSavedMs).toBe(34_970 - 834)

    expect(await mission.showDebrief()).toMatchObject({ success: true, data: { phase: 'debrief' } })
    expect(state().progress.debrief).toEqual({ missionId: ID, verdict: passed.data })
    expect(recorded.of(GAME_EVENTS.RUN_RECORDED)).toMatchObject([
      { role: 'baseline', passed: false },
      { role: 'attempt', passed: false },
      { role: 'attempt', passed: true },
    ])
    expect(recorded.of(GAME_EVENTS.MISSION_COMPLETED)).toEqual([
      { missionId: ID, attempts: 2, hintsUsed: 0, at: completedAt },
    ])
    // Every step was written before its flow resolved.
    expect(storedProgress(storage.map.get(KEY))).toEqual(state().progress)
    recorded.stop()
  })

  it("reopens at a debrief left open, with the verdict it was shown with, as Kernelfall's card", async () => {
    const { mission, storage } = await openGame()
    await mission.start(ID)
    mission.begin()
    const passed = await mission.submitRun(bfdBothEndsRun())
    await mission.showDebrief()
    mission.leave()

    // A reload: the game starts empty and reads the save again from the same storage.
    expect(storedProgress(storage.map.get(KEY)).debrief).toEqual({ missionId: ID, verdict: passed.data })
    await uninstallTestGame()
    installTestGame({ storage })
    await createSaveActions().open()
    expect(await createMissionActions().start(ID)).toMatchObject({
      success: true,
      data: { phase: 'debrief', verdict: passed.data },
    })
  })

  it('closes the debrief when the player leaves through it or goes back into play', async () => {
    const { mission, storage } = await openGame()
    await mission.start(ID)
    await mission.submitRun(bfdBothEndsRun())
    await mission.showDebrief()

    await mission.leaveDebrief()
    expect(state().progress.debrief).toBeUndefined()
    expect(storedProgress(storage.map.get(KEY)).debrief).toBeUndefined()
    expect(await mission.start(ID)).toMatchObject({ data: { phase: 'incident', verdict: null } })

    await mission.submitRun(bfdBothEndsRun())
    await mission.showDebrief()
    expect(mission.begin()).toMatchObject({ success: true, data: { phase: 'play' } })
    expect(state().progress.debrief).toBeUndefined()
  })

  it("opens another mission at its incident while one mission's debrief is open", async () => {
    const { mission } = await openGame()
    await mission.start(ID)
    await mission.submitRun(bfdBothEndsRun())
    await mission.showDebrief()
    expect(await mission.start(FOLLOW_UP_MISSION.id)).toMatchObject({ data: { phase: 'incident' } })
    expect(state().progress.debrief?.missionId).toBe(ID)
  })

  it('completes a mission once: passing again changes neither the date nor the order', async () => {
    const { mission, clock } = await openGame()
    const recorded = recordGameEvents()
    await mission.start(ID)
    await mission.submitRun(bfdBothEndsRun())
    const first = findMissionProgress(state().progress, ID)?.completedAt

    clock.advance(5_000)
    await mission.submitRun(bfdBothEndsRun())
    expect(findMissionProgress(state().progress, ID)).toMatchObject({ attempts: 2, completedAt: first })
    expect(state().progress.completionOrder).toEqual([ID])
    expect(recorded.of(GAME_EVENTS.MISSION_COMPLETED)).toHaveLength(1)
    recorded.stop()
  })

  it('reports the hints used when the mission is completed', async () => {
    const { mission } = await openGame()
    const recorded = recordGameEvents()
    await mission.start(ID)
    await revealHint()
    await revealHint()
    await mission.submitRun(bfdBothEndsRun())
    expect(recorded.of(GAME_EVENTS.MISSION_COMPLETED)).toMatchObject([{ attempts: 1, hintsUsed: 2 }])
    recorded.stop()
  })

  it("replays from the incident as Kernelfall's Replay level: no verdict, every hint again, nothing left open", async () => {
    const { mission, storage, clock } = await openGame()
    await mission.start(ID)
    mission.begin()
    await revealHint()
    await revealHint()
    await mission.submitRun(bfdBothEndsRun())
    await mission.showDebrief()
    const recorded = recordGameEvents()

    const replayed = await mission.replay()

    expect(replayed).toMatchObject({
      success: true,
      data: { mission: EXAMPLE_MISSION, phase: 'incident', verdict: null },
    })
    expect(state().active).toMatchObject({ phase: 'incident', verdict: null })
    const record = findMissionProgress(state().progress, ID)
    expect(record).toMatchObject({ hintsRevealed: 0, attempts: 1 })
    expect(record?.completedAt).not.toBeNull()
    expect(state().progress.completionOrder).toEqual([ID])
    expect(state().progress.debrief).toBeUndefined()
    const saved = storedProgress(storage.map.get(KEY))
    expect(saved.debrief).toBeUndefined()
    expect(findMissionProgress(saved, ID)?.hintsRevealed).toBe(0)
    expect(recorded.of(GAME_EVENTS.MISSION_STARTED)).toEqual([{ missionId: ID, resumed: true, at: clock.now() }])
    recorded.stop()
  })

  it('replays only an active mission', async () => {
    const { mission } = await openGame()
    expect(await mission.replay()).toMatchObject({ success: false })
  })

  it('counts no attempt for a mission opened twice, as React opens it twice in development', async () => {
    const { mission } = await openGame()
    await mission.start(ID)
    mission.leave()
    await mission.start(ID)
    expect(state().progress.missions.filter((record) => record.missionId === ID)).toHaveLength(1)
    expect(findMissionProgress(state().progress, ID)).toMatchObject({ attempts: 0, hintsRevealed: 0 })
    expect(state().active).toMatchObject({ phase: 'incident' })
  })

  it('judges the events so far without keeping anything', async () => {
    const { mission } = await openGame()
    await mission.start(ID)
    const before = state().progress

    const live = mission.judge(healthyRun())
    expect(live.data?.passed).toBe(false)
    expect(live.data?.objectives.map(({ result }) => result.passed)).toEqual([true, true, false])
    expect(state().progress).toBe(before)
    expect(state().active?.verdict).toBeNull()
  })

  it('leaves the mission but keeps its progress', async () => {
    const { mission } = await openGame()
    await mission.start(ID)
    mission.leave()
    expect(state().active).toBeNull()
    expect(findMissionProgress(state().progress, ID)).toBeDefined()
  })
})
