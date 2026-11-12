// @vitest-environment jsdom
import { useAppStore } from '@app/store'
import { cleanup, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useGameNotices } from './useGameNotices.hook'

type Listener = (event: { payload: unknown }) => void
const bus = vi.hoisted(() => ({ listeners: new Map<string, Listener>() }))

vi.mock('@peerfall/core/hooks', () => ({
  useEventListener: (pattern: string, listener: Listener) => {
    bus.listeners.set(pattern, listener)
  },
}))
vi.mock('@peerfall/game', () => ({
  GAME_EVENTS: { MISSION_COMPLETED: 'GAME_MISSION_COMPLETED', SAVE_FAILED: 'GAME_SAVE_FAILED' },
}))

afterEach(() => {
  cleanup()
  bus.listeners.clear()
  for (const { id } of useAppStore.getState().notices) {
    useAppStore.getState().dismissNotice(id)
  }
})

describe('useGameNotices', () => {
  it('says a mission passed, by its title', () => {
    renderHook(() => useGameNotices((id) => `Title of ${id}`))
    bus.listeners.get('GAME_MISSION_COMPLETED')?.({
      payload: { missionId: 'the-link', attempts: 2, hintsUsed: 0, at: 7 },
    })
    expect(useAppStore.getState().notices).toMatchObject([
      { kind: 'complete', kicker: 'Mission passed', text: 'Title of the-link' },
    ])
  })

  it('keeps a failed save on the status line until it is dismissed', () => {
    renderHook(() => useGameNotices((id) => id))
    bus.listeners.get('GAME_SAVE_FAILED')?.({ payload: { issue: 'write_failed', at: 9 } })
    expect(useAppStore.getState().notices).toMatchObject([{ kind: 'save-failed', sticky: true }])
  })
})
