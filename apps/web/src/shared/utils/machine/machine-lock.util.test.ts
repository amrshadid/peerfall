import { describe, expect, it } from 'vitest'
import { machineLockOf } from './machine-lock.util'

describe('machineLockOf', () => {
  it('is null once the shell is at its prompt', () => {
    expect(machineLockOf({ phase: 'ready', detail: null }, true)).toBeNull()
  })

  it('names the phase and says why Apply waits', () => {
    const lock = machineLockOf({ phase: 'booting', detail: null }, false)
    expect(lock).toMatchObject({ phase: 'booting', title: 'Booting Linux', failed: false, holdsKeys: false })
    expect(lock?.applyReason).toBe('Booting Linux. Apply works once the network is up.')
  })

  it("prefers the status's own words", () => {
    expect(machineLockOf({ phase: 'setting-up', detail: 'router b: ospfd' }, false)?.detail).toBe('router b: ospfd')
  })

  it('holds keys while a network is restored, never while one is built, and only after the first boot', () => {
    expect(machineLockOf({ phase: 'setting-up', detail: null }, false)?.holdsKeys).toBe(false)
    expect(machineLockOf({ phase: 'setting-up', detail: null }, true)?.holdsKeys).toBe(false)
    expect(machineLockOf({ phase: 'restoring', detail: null }, false)?.holdsKeys).toBe(false)
    const restoring = machineLockOf({ phase: 'restoring', detail: null }, true)
    expect(restoring?.holdsKeys).toBe(true)
    expect(restoring?.detail).toContain('reaches the shell')
  })

  it('marks a failure and tells the player to reload', () => {
    const lock = machineLockOf({ phase: 'failed', detail: 'no image' }, false)
    expect(lock).toMatchObject({ failed: true, detail: 'no image' })
    expect(lock?.applyReason).toContain('Reload the page')
  })
})
