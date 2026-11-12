import { afterEach, describe, expect, it } from 'vitest'
import { configureGame, getGameConfig, resetGameConfig } from '#config'

describe('game config', () => {
  afterEach(() => resetGameConfig())

  it('has no storage until the app passes one', () => {
    expect(getGameConfig().storage).toBeNull()
  })

  it('keeps the storage the app passes and resets to none', () => {
    const storage = {
      getItem: async () => null,
      setItem: async () => {},
      removeItem: async () => {},
    }
    configureGame({ storage })
    expect(getGameConfig().storage).toBe(storage)
    resetGameConfig()
    expect(getGameConfig().storage).toBeNull()
  })
})
