// @vitest-environment jsdom
import { cleanup, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createMissionActions } from '#hooks/mission/useMissionActions.hook'
import { useSaveFailed } from '#hooks/notifications/useSaveFailed.hook'
import { createSaveActions } from '#hooks/saves/useSaveActions.hook'
import { createFailingStorage, EXAMPLE_MISSION, installTestGame, uninstallTestGame } from '#test/index'
import { SAVE_ISSUES } from '#types/definitions/saves'

describe('useSaveFailed', () => {
  afterEach(() => {
    cleanup()
    uninstallTestGame()
  })

  it('hears each save that storage refused', async () => {
    const { clock } = installTestGame({ storage: createFailingStorage() })
    await createSaveActions().open()
    const handler = vi.fn()
    renderHook(() => useSaveFailed(handler))

    await createMissionActions().start(EXAMPLE_MISSION.id)

    expect(handler).toHaveBeenCalledExactlyOnceWith({ issue: SAVE_ISSUES.writeFailed, at: clock.now() })
  })

  it('hears nothing while saves land', async () => {
    installTestGame()
    await createSaveActions().open()
    const handler = vi.fn()
    renderHook(() => useSaveFailed(handler))

    await createMissionActions().start(EXAMPLE_MISSION.id)

    expect(handler).not.toHaveBeenCalled()
  })
})
