import { describe, expect, it } from 'vitest'
import { storageTextOf } from './storage-text.util'

describe('storageTextOf', () => {
  it('says saves stay in this browser, or plainly why nothing is kept', () => {
    expect(storageTextOf(null)).toBe('Saved in this browser')
    expect(storageTextOf('private')).toMatch(/^Not saved: storage is off/)
    expect(storageTextOf('full')).toMatch(/^Not saved: storage refused/)
    expect(storageTextOf('unreadable')).toMatch(/^Not saved: the stored game/)
  })
})
