// @vitest-environment jsdom
import { cleanup, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useExportSave } from './useExportSave.hook'

vi.mock('@peerfall/game/hooks', () => ({
  useSaveActions: () => ({ exportSave: () => '{"version":1}' }),
}))

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('useExportSave', () => {
  it("downloads the game's save as a dated JSON file and frees the object URL", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 9, 30, 12))
    // jsdom has no object URLs and doesn't navigate; the test only needs to see the calls.
    const createObjectURL = vi.fn((_blob: Blob) => 'blob:save')
    const revokeObjectURL = vi.fn()
    Object.assign(URL, { createObjectURL, revokeObjectURL })
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      expect(this.download).toBe('peerfall-save-2026-10-30.json')
      expect(this.href).toBe('blob:save')
    })

    const { result } = renderHook(() => useExportSave())
    result.current()

    expect(click).toHaveBeenCalledOnce()
    expect(await createObjectURL.mock.calls[0]?.[0].text()).toBe('{"version":1}')
    // Not while the download starts, only after it.
    expect(revokeObjectURL).not.toHaveBeenCalled()
    vi.runAllTimers()
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:save')
  })
})
