import { describe, expect, it } from 'vitest'
import { saveStateOf, storageIssueOf } from './save-status.util'

describe('storageIssueOf', () => {
  it('names why progress is not stored', () => {
    expect(storageIssueOf(null, true)).toBeNull()
    expect(storageIssueOf(null, false)).toBe('private')
    expect(storageIssueOf('write_failed', true)).toBe('full')
    // An unreadable save is the bigger problem: it is kept untouched and nothing is saved.
    expect(storageIssueOf('unreadable', false)).toBe('unreadable')
  })
})

describe('saveStateOf', () => {
  it('reads saving, memory-only and failed states', () => {
    expect(saveStateOf(false, null)).toBe('saved')
    expect(saveStateOf(true, null)).toBe('saving')
    expect(saveStateOf(false, 'private')).toBe('memory')
    expect(saveStateOf(false, 'unreadable')).toBe('memory')
    expect(saveStateOf(true, 'full')).toBe('failed')
  })
})
