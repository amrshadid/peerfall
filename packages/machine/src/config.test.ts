import { afterEach, describe, expect, it } from 'vitest'
import { configureMachine, getMachineConfig, resetMachineConfig } from '#config'

describe('machine config', () => {
  afterEach(() => resetMachineConfig())

  it('serves the image from /vm/ and uses the worker’s own wasm by default', () => {
    expect(getMachineConfig()).toMatchObject({ vmBaseUrl: '/vm/', vmWasmUrl: null })
  })

  it('takes the app’s base URL and resets to the default', () => {
    configureMachine({ vmBaseUrl: '/play/vm/' })
    expect(getMachineConfig().vmBaseUrl).toBe('/play/vm/')
    resetMachineConfig()
    expect(getMachineConfig().vmBaseUrl).toBe('/vm/')
  })
})
