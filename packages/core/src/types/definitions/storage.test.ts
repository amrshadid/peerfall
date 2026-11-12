import { describe, expect, it } from 'vitest'
import { STORAGE_KEYS } from '#types/definitions/storage'

describe('STORAGE_KEYS', () => {
  it('gives every localStorage key its own versioned name', () => {
    const keys = Object.values(STORAGE_KEYS)
    expect(new Set(keys).size).toBe(keys.length)
    for (const key of keys) {
      expect(key).toMatch(/^peerfall:v\d+:[a-z-]+$/)
    }
  })
})
