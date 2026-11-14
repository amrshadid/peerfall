import { describe, expect, it } from 'vitest'
import { networkStatusOf } from './machine-status.util'

describe('networkStatusOf', () => {
  it('says the network is starting while Linux is up and the network is still being built', () => {
    expect(networkStatusOf('ready', 'building')).toBe('Network: starting')
  })

  it('says the routers are finding each other while routing settles behind the plate', () => {
    expect(networkStatusOf('ready', 'settling')).toBe('Network: routers finding each other')
  })

  it("leaves the Machine's own word once the network is there, and while the Machine itself is not ready", () => {
    expect(networkStatusOf('ready', 'ready')).toBeNull()
    expect(networkStatusOf('ready', 'faulted')).toBeNull()
    expect(networkStatusOf('ready', null)).toBeNull()
    expect(networkStatusOf('setting-up', 'building')).toBeNull()
    expect(networkStatusOf('booting', 'building')).toBeNull()
  })
})
