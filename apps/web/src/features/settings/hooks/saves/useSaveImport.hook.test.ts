// @vitest-environment jsdom
import { emptyProgress, exportSave } from '@peerfall/game/utils'
import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useSaveImport } from './useSaveImport.hook'

const game = vi.hoisted(() => ({ importSave: vi.fn() }))

vi.mock('@peerfall/game/hooks', () => ({ useSaveActions: () => ({ importSave: game.importSave }) }))

afterEach(() => {
  cleanup()
  game.importSave.mockReset()
})

const SAVE = exportSave(emptyProgress(), Date.UTC(2026, 9, 12, 12))

describe('useSaveImport', () => {
  it('previews the chosen file and imports it only on confirm', async () => {
    game.importSave.mockResolvedValue({ success: true })
    const onDone = vi.fn()
    const { result } = renderHook(() => useSaveImport(onDone))

    act(() => result.current.choose(SAVE))
    expect(result.current.preview).toMatchObject({ valid: true })
    expect(game.importSave).not.toHaveBeenCalled()

    await act(() => result.current.confirm())
    expect(game.importSave).toHaveBeenCalledWith(SAVE)
    expect(onDone).toHaveBeenCalledWith(true)
    expect(result.current.preview).toBeNull()
  })

  it('drops the file on cancel and does nothing on a confirm with no file', async () => {
    const onDone = vi.fn()
    const { result } = renderHook(() => useSaveImport(onDone))
    act(() => result.current.choose(SAVE))
    act(() => result.current.cancel())
    expect(result.current.preview).toBeNull()

    await act(() => result.current.confirm())
    expect(game.importSave).not.toHaveBeenCalled()
    expect(onDone).not.toHaveBeenCalled()
  })

  it('reports a refused import', async () => {
    game.importSave.mockResolvedValue({ success: false })
    const onDone = vi.fn()
    const { result } = renderHook(() => useSaveImport(onDone))
    act(() => result.current.choose(SAVE))
    await act(() => result.current.confirm())
    expect(onDone).toHaveBeenCalledWith(false)
  })
})
