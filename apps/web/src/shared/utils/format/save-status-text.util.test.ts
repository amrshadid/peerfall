import { describe, expect, it } from 'vitest'
import { formatAgo, saveStatusText } from './save-status-text.util'

describe('formatAgo', () => {
  it('says roughly when, never counting seconds like a timer', () => {
    expect(formatAgo(3_400)).toBe('just now')
    expect(formatAgo(59_999)).toBe('just now')
    expect(formatAgo(90_000)).toBe('a minute ago')
    expect(formatAgo(4 * 60_000)).toBe('a few minutes ago')
    expect(formatAgo(45 * 60_000)).toBe('half an hour ago')
    expect(formatAgo(70 * 60_000)).toBe('an hour ago')
    expect(formatAgo(3 * 3_600_000)).toBe('3 hours ago')
  })

  it('never prints a negative age', () => {
    expect(formatAgo(-500)).toBe('just now')
  })
})

describe('saveStatusText', () => {
  it('says how long ago the last save was', () => {
    expect(saveStatusText('saved', 3_000)).toBe('Saved just now')
    expect(saveStatusText('saved', null)).toBe('Saved')
  })

  it('says plainly when nothing is being kept', () => {
    expect(saveStatusText('memory', null)).toMatch(/^Not saved/)
    expect(saveStatusText('failed', 1)).toMatch(/^Not saved/)
  })
})
