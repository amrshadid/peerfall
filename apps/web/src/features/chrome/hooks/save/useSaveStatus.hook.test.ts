// @vitest-environment jsdom
import { cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useSaveStatus } from './useSaveStatus.hook'

const game = vi.hoisted(() => ({
  progress: { isSaving: false, lastSavedAt: null as number | null, saveIssue: null as string | null },
}))
const page = vi.hoisted(() => ({ persistent: true }))

vi.mock('@peerfall/game/hooks', () => ({ useProgress: () => game.progress }))
vi.mock('@shared/utils/storage', () => ({ pageStorage: () => page }))

beforeEach(() => {
  game.progress = { isSaving: false, lastSavedAt: null, saveIssue: null }
  page.persistent = true
})

afterEach(() => {
  cleanup()
})

describe('useSaveStatus', () => {
  it('reports a save in flight and when the last one landed', () => {
    game.progress = { isSaving: true, lastSavedAt: 42, saveIssue: null }
    const { result } = renderHook(() => useSaveStatus())
    expect(result.current).toEqual({ saveState: 'saving', lastSavedAt: 42, storageIssue: null })
  })

  it('says progress lives in memory when the page has no storage', () => {
    page.persistent = false
    const { result } = renderHook(() => useSaveStatus())
    expect(result.current).toMatchObject({ saveState: 'memory', storageIssue: 'private' })
  })

  it('says a refused write failed', () => {
    game.progress = { isSaving: false, lastSavedAt: null, saveIssue: 'write_failed' }
    const { result } = renderHook(() => useSaveStatus())
    expect(result.current).toMatchObject({ saveState: 'failed', storageIssue: 'full' })
  })
})
