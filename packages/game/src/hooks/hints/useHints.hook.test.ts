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

async function startedGame() {
  const game = installTestGame()
  await createSaveActions().open()
  await createMissionActions().start(EXAMPLE_MISSION.id)
  return game
}

describe('revealHint', () => {
  afterEach(uninstallTestGame)

  it("reveals the mission's three hints one at a time, the command last, and saves each", async () => {
    const { storage } = await startedGame()
    const revealed: [string, number][] = []
    const subscription = eventBus.on<HintRevealedPayload>(GAME_EVENTS.HINT_REVEALED, (event) => {
      revealed.push([event.payload.tier, event.payload.stage])
    })

    const first = await revealHint()
    expect(first).toMatchObject({ success: true, data: { tier: 'nudge' } })
    expect(first.data?.command).toBeUndefined()
    await revealHint()
    const last = await revealHint()
    expect(last).toMatchObject({ success: true, data: { tier: 'spot', command: 'ip ospf bfd' } })

    expect(revealed).toEqual([
      ['nudge', 1],
      ['concept', 2],
      ['spot', 3],
    ])
    expect(findMissionProgress(state().progress, EXAMPLE_MISSION.id)?.hintsRevealed).toBe(3)
    expect([...storage.map.values()].some((json) => json.includes('"hintsRevealed":3'))).toBe(true)
    subscription.unsubscribe()
  })

  it('fails as a value when nothing is left or no mission is active', async () => {
    await startedGame()
    await revealHint()
    await revealHint()
    await revealHint()
    const before = state().progress

    expect(await revealHint()).toMatchObject({ success: false, error: { code: 'NOT_FOUND' } })
    expect(state().progress).toBe(before)

    createMissionActions().leave()
    expect(await revealHint()).toMatchObject({ success: false, error: { code: 'NOT_READY' } })
  })
})
