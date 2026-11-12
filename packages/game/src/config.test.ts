import { afterEach, describe, expect, it } from 'vitest'
import { configureGame, getGameConfig, getGameNow, resetGameConfig } from '#config'
import { exampleContent } from '#test/index'

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

  it('keeps the content and the clock the app passes, and defaults for the rest', () => {
    const content = exampleContent()
    configureGame({ content, clock: { now: () => 42 } })
    expect(getGameConfig()).toMatchObject({ content, storage: null, slot: 'main', autosave: true })
    expect(getGameNow()).toBe(42)
    resetGameConfig()
    expect(getGameConfig().content).toBeNull()
  })
})
