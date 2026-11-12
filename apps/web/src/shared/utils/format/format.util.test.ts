import { describe, expect, it } from 'vitest'
import { formatDuration, formatLastPlayed, formatPercent } from './format.util'

describe('formatLastPlayed and formatDuration', () => {
  it('print short, human times', () => {
    const now = 1_000_000_000
    expect(formatLastPlayed(now, now - 10_000)).toBe('just now')
    expect(formatLastPlayed(now, now - 2 * 86_400_000)).toBe('2 days ago')
    expect(formatDuration(100 * 60_000)).toBe('1 h 40 min')
    expect(formatDuration(12 * 60_000)).toBe('12 min')
  })
})

describe('formatPercent', () => {
  it('keeps one decimal only where the ratio needs it', () => {
    expect(formatPercent(0.875)).toBe('87.5%')
    expect(formatPercent(1.25)).toBe('125%')
  })
})
