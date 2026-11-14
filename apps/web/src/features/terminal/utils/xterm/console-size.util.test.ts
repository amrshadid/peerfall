import { describe, expect, it } from 'vitest'
import { consoleSize } from './console-size.util'

// IBM Plex Mono: 0.6px of advance per px of type, so 90 columns take 54px per px of type.
const PLEX = 0.6

describe('consoleSize', () => {
  it("keeps Section 2's 14px when 90 columns fit, and never grows past it", () => {
    expect(consoleSize(756, PLEX)).toEqual({ fontSize: 14, gridWidth: 756, narrow: false })
    expect(consoleSize(1100, PLEX)).toMatchObject({ fontSize: 14, narrow: false })
  })

  it('shrinks in half-pixel steps to keep 90 columns: 1440px with the network open', () => {
    // 1440px: a 730px centre column, less 16px padding and xterm's 14px scrollbar.
    const size = consoleSize(700, PLEX)
    expect(size.fontSize).toBe(12.5)
    expect(size.gridWidth).toBeLessThanOrEqual(700)
    expect(size.narrow).toBe(false)
  })

  it('stops at 11px when even that is too wide for 90 columns: 1024px with the network open', () => {
    // 1024px: a 424px centre column.
    expect(consoleSize(394, PLEX)).toEqual({ fontSize: 11, gridWidth: 594, narrow: true })
  })

  it('fits exactly at the 11px floor', () => {
    expect(consoleSize(594, PLEX)).toEqual({ fontSize: 11, gridWidth: 594, narrow: false })
  })
})
