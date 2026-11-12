import { eventBus } from '@peerfall/core/services'
import { afterEach, describe, expect, it } from 'vitest'
import { GAME_EVENTS, type HintRevealedPayload } from '#events/types'
import { revealHint } from '#hooks/hints/useHints.hook'
import { createMissionActions } from '#hooks/mission/useMissionActions.hook'
import { createSaveActions } from '#hooks/saves/useSaveActions.hook'
import { useProgressStore } from '#store/progress.store'
import { EXAMPLE_MISSION, installTestGame, uninstallTestGame } from '#test/index'
import { findMissionProgress } from '#utils/progress/index'

const state = useProgressStore.getState
const OBJECTIVE = 'recovers-through-b'

async function startedGame() {
  const game = installTestGame()
  await createSaveActions().open()
  await createMissionActions().start(EXAMPLE_MISSION.id)
  return game
}

describe('revealHint', () => {
  afterEach(uninstallTestGame)

  it("reveals an objective's hints one at a time, the command last, and saves each", async () => {
    const { storage } = await startedGame()
    const stages: number[] = []
    const subscription = eventBus.on<HintRevealedPayload>(GAME_EVENTS.HINT_REVEALED, (event) => {
      stages.push(event.payload.stage)
    })

    const first = await revealHint(OBJECTIVE)
    expect(first.data?.command).toBeUndefined()
    await revealHint(OBJECTIVE)
    const last = await revealHint(OBJECTIVE)
    expect(last).toMatchObject({ success: true, data: { command: 'ip ospf bfd' } })

    expect(stages).toEqual([1, 2, 3])
    expect(findMissionProgress(state().progress, EXAMPLE_MISSION.id)?.hintsRevealed).toEqual({ [OBJECTIVE]: 3 })
    expect([...storage.map.values()].some((json) => json.includes(`"${OBJECTIVE}":3`))).toBe(true)
    subscription.unsubscribe()
  })

  it('fails as a value when nothing is left, the objective is unknown or no mission is active', async () => {
    await startedGame()
    await revealHint('reaches-c')
    await revealHint('reaches-c')
    const before = state().progress

    expect(await revealHint('reaches-c')).toMatchObject({ success: false, error: { code: 'NOT_FOUND' } })
    expect(await revealHint('nope')).toMatchObject({ success: false, error: { code: 'NOT_FOUND' } })
    expect(state().progress).toBe(before)

    createMissionActions().leave()
    expect(await revealHint(OBJECTIVE)).toMatchObject({ success: false, error: { code: 'NOT_READY' } })
  })
})
