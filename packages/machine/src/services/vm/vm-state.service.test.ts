import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { loadVmState, saveVmState } from '#services/vm/vm-state.service'
import { fakeIndexedDb } from '#test/fake-indexed-db'

describe('the saved boot', () => {
  beforeEach(() => vi.stubGlobal('indexedDB', fakeIndexedDb()))
  afterEach(() => vi.unstubAllGlobals())

  it('comes back for the image it was saved for, and never for another one', async () => {
    expect(await saveVmState('image-a', new Uint8Array([1, 2, 3]).buffer)).toBe(true)
    expect(new Uint8Array((await loadVmState('image-a')) ?? new ArrayBuffer(0))).toEqual(new Uint8Array([1, 2, 3]))
    expect(await loadVmState('image-b')).toBeNull()
  })

  it("replaces an older image's boot, which could never be restored again", async () => {
    await saveVmState('image-a', new Uint8Array([1]).buffer)
    await saveVmState('image-b', new Uint8Array([2]).buffer)
    expect(await loadVmState('image-a')).toBeNull()
    expect(await loadVmState('image-b')).not.toBeNull()
  })

  it('gives nothing, without throwing, when storage is unavailable', async () => {
    vi.stubGlobal('indexedDB', {
      open: () => {
        throw new DOMException('blocked', 'SecurityError')
      },
    })
    expect(await loadVmState('image-a')).toBeNull()
    expect(await saveVmState('image-a', new ArrayBuffer(1))).toBe(false)
  })
})
