import { afterEach, describe, expect, it } from 'vitest'
import { configureMachine, getMachineConfig, resetMachineConfig } from '#config'

describe('machine config', () => {
  afterEach(() => resetMachineConfig())

  it('serves the image from /vm/ by default', () => {
    expect(getMachineConfig()).toEqual({ vmBaseUrl: '/vm/' })
  })

  it('takes the app’s base URL and resets to the default', () => {
    configureMachine({ vmBaseUrl: '/play/vm/' })
    expect(getMachineConfig().vmBaseUrl).toBe('/play/vm/')
    resetMachineConfig()
    expect(getMachineConfig().vmBaseUrl).toBe('/vm/')
  })
})
