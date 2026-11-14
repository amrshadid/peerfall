// @vitest-environment jsdom
import { useAppStore } from '@app/store'
import { cleanup, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useGameNotices } from './useGameNotices.hook'

type Handler = (payload: unknown) => void
const game = vi.hoisted(() => ({ handlers: new Map<string, Handler>() }))

vi.mock('@peerfall/game/hooks', () => ({
  useMissionCompleted: (handler: Handler) => {
    game.handlers.set('completed', handler)
  },
  useSaveFailed: (handler: Handler) => {
    game.handlers.set('save-failed', handler)
  },
}))

afterEach(() => {
  cleanup()
  game.handlers.clear()
  for (const { id } of useAppStore.getState().notices) {
    useAppStore.getState().dismissNotice(id)
  }
})

describe('useGameNotices', () => {
  it('says a mission passed, by its title', () => {
    renderHook(() => useGameNotices((id) => `Title of ${id}`))
    game.handlers.get('completed')?.({ missionId: 'the-link', attempts: 2, hintsUsed: 0, at: 7 })
    expect(useAppStore.getState().notices).toMatchObject([
      { kind: 'complete', kicker: 'Mission passed', text: 'Title of the-link' },
    ])
  })

  it('says which Codex cards the pass filed, after the pass', () => {
    renderHook(() =>
      useGameNotices(
        (id) => id,
        () => ['vtysh', 'watchfrr']
      )
    )
    game.handlers.get('completed')?.({ missionId: 'the-silent-router', attempts: 1, hintsUsed: 0, at: 3 })
    expect(useAppStore.getState().notices).toMatchObject([
      { kind: 'complete' },
      { kind: 'info', kicker: '2 cards filed in the Codex', text: 'vtysh, watchfrr' },
    ])
  })

  it('keeps a failed save on the status line until it is dismissed', () => {
    renderHook(() => useGameNotices((id) => id))
    game.handlers.get('save-failed')?.({ issue: 'write_failed', at: 9 })
    expect(useAppStore.getState().notices).toMatchObject([{ kind: 'save-failed', sticky: true }])
  })
})
