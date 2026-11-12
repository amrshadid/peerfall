import { describe, expect, it } from 'vitest'
import { clampSize, draggedSize, keyedSize, limitsAtLeast } from './splitter.util'

const LIMITS = { min: 15, max: 34 }

describe('limitsAtLeast', () => {
  it('raises the minimum to what the panel needs, rounded up', () => {
    expect(limitsAtLeast(LIMITS, 23.4567)).toEqual({ min: 23.46, max: 34 })
  })

  it('keeps the limits when the need is smaller or unknown', () => {
    expect(limitsAtLeast(LIMITS, 12)).toBe(LIMITS)
    expect(limitsAtLeast(LIMITS, null)).toBe(LIMITS)
    expect(limitsAtLeast(LIMITS, Number.NaN)).toBe(LIMITS)
  })

  it('moves the maximum along when the need passes it', () => {
    expect(limitsAtLeast(LIMITS, 40)).toEqual({ min: 40, max: 40 })
  })

  it('stops a drag at the raised minimum', () => {
    expect(draggedSize(30, -10_000, 16, 1, limitsAtLeast(LIMITS, 26))).toBe(26)
  })
})

describe('draggedSize', () => {
  it('grows a left panel when dragged right, in the size unit', () => {
    expect(draggedSize(20, 32, 16, 1, LIMITS)).toBe(22)
  })

  it('grows a right panel when dragged left', () => {
    expect(draggedSize(20, -32, 16, -1, LIMITS)).toBe(22)
  })

  it('never passes the limits', () => {
    expect(draggedSize(20, 10_000, 16, 1, LIMITS)).toBe(34)
    expect(draggedSize(20, -10_000, 16, 1, LIMITS)).toBe(15)
  })
})

describe('keyedSize', () => {
  it('moves the divider a step with the arrows, the same way as dragging', () => {
    expect(keyedSize(20, 'ArrowRight', 1, 1, LIMITS)).toBe(21)
    expect(keyedSize(20, 'ArrowLeft', 1, 1, LIMITS)).toBe(19)
    expect(keyedSize(20, 'ArrowLeft', 1, -1, LIMITS)).toBe(21)
  })

  it('jumps to the limits with Home and End, and ignores other keys', () => {
    expect(keyedSize(20, 'Home', 1, 1, LIMITS)).toBe(15)
    expect(keyedSize(20, 'End', 1, 1, LIMITS)).toBe(34)
    expect(keyedSize(20, 'a', 1, 1, LIMITS)).toBeNull()
  })
})

describe('clampSize', () => {
  it('rounds to two decimals inside the limits', () => {
    expect(clampSize(20.123_456, LIMITS)).toBe(20.12)
  })
})
