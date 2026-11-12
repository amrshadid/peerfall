// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useNewGame } from './useNewGame.hook'

const mocks = vi.hoisted(() => ({
  reset: vi.fn(async () => undefined),
  exportSave: vi.fn(),
  navigateTo: vi.fn(),
}))

vi.mock('@peerfall/game/hooks', () => ({ useSaveActions: () => ({ reset: mocks.reset }) }))
vi.mock('@features/chrome/hooks/save', () => ({ useExportSave: () => mocks.exportSave }))
vi.mock('@shared/navigation', () => ({ navigateTo: mocks.navigateTo }))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('useNewGame', () => {
  it('starts the first mission at once without a save', () => {
    const { result } = renderHook(() => useNewGame({ hasSave: false, firstMission: 'the-link' }))
    act(() => result.current.newGame())
    expect(result.current.confirming).toBe(false)
    expect(mocks.navigateTo).toHaveBeenCalledWith({ name: 'mission', missionId: 'the-link' })
  })

  it('asks first with a save, and cancel keeps it', () => {
    const { result } = renderHook(() => useNewGame({ hasSave: true, firstMission: 'the-link' }))
    act(() => result.current.newGame())
    expect(result.current.confirming).toBe(true)
    act(() => result.current.cancel())
    expect(result.current.confirming).toBe(false)
    expect(mocks.reset).not.toHaveBeenCalled()
    expect(mocks.navigateTo).not.toHaveBeenCalled()
  })

  it('exports, wipes and starts over when asked', async () => {
    const { result } = renderHook(() => useNewGame({ hasSave: true, firstMission: 'the-link' }))
    act(() => result.current.newGame())
    await act(() => result.current.startOver(true))
    expect(mocks.exportSave).toHaveBeenCalledOnce()
    expect(mocks.reset).toHaveBeenCalledOnce()
    expect(result.current.confirming).toBe(false)
    expect(mocks.navigateTo).toHaveBeenCalledWith({ name: 'mission', missionId: 'the-link' })
  })
})
