import { describe, expect, it } from 'vitest'
import { consoleSize } from './console-size.util'

// IBM Plex Mono: 0.6px of advance per px of type, so 80 columns take 48px per px of type.
const PLEX = 0.6

describe('consoleSize', () => {
  it("keeps Section 2's 14px when 80 columns fit, and never grows past it", () => {
    expect(consoleSize(672, PLEX)).toEqual({ fontSize: 14, gridWidth: 672, scrolls: false })
    expect(consoleSize(1100, PLEX)).toMatchObject({ fontSize: 14, scrolls: false })
  })

  it('shrinks in half-pixel steps to keep 80 columns: 1440px with X-ray open', () => {
    // 1440px: a 650px centre column, less 16px padding and xterm's 14px scrollbar.
    const size = consoleSize(620, PLEX)
    expect(size.fontSize).toBe(12.5)
    expect(size.gridWidth).toBeLessThanOrEqual(620)
    expect(size.scrolls).toBe(false)
  })

  it('stops at 11px and scrolls sideways when even that is too wide: 1024px with X-ray open', () => {
    // 1024px: a 424px centre column.
    expect(consoleSize(394, PLEX)).toEqual({ fontSize: 11, gridWidth: 528, scrolls: true })
  })

  it('fits exactly at the 11px floor without scrolling', () => {
    expect(consoleSize(528, PLEX)).toEqual({ fontSize: 11, gridWidth: 528, scrolls: false })
  })
})
