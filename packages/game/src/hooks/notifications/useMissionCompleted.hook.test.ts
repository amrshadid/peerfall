// @vitest-environment jsdom
import { cleanup, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createMissionActions } from '#hooks/mission/useMissionActions.hook'
import { useMissionCompleted } from '#hooks/notifications/useMissionCompleted.hook'
import { createSaveActions } from '#hooks/saves/useSaveActions.hook'
import { baselineRun, bfdBothEndsRun, EXAMPLE_MISSION, installTestGame, uninstallTestGame } from '#test/index'

describe('useMissionCompleted', () => {
  afterEach(() => {
    cleanup()
    uninstallTestGame()
  })

  it('hears a mission passed the first time, and not the runs before or after', async () => {
    const { clock } = installTestGame()
    await createSaveActions().open()
    const mission = createMissionActions()
    await mission.start(EXAMPLE_MISSION.id)
    const handler = vi.fn()
    renderHook(() => useMissionCompleted(handler))

    await mission.submitRun(baselineRun())
    expect(handler).not.toHaveBeenCalled()
    await mission.submitRun(bfdBothEndsRun())
    await mission.submitRun(bfdBothEndsRun())

    expect(handler).toHaveBeenCalledExactlyOnceWith({
      missionId: EXAMPLE_MISSION.id,
      attempts: 2,
      hintsUsed: 0,
      at: clock.now(),
    })
  })
})
