import { describe, expect, it } from 'vitest'
import { nextTabIndex } from './tabs.util'

describe('nextTabIndex', () => {
  it('moves with the arrows and wraps at both ends', () => {
    expect(nextTabIndex(0, 'ArrowRight', 3)).toBe(1)
    expect(nextTabIndex(2, 'ArrowRight', 3)).toBe(0)
    expect(nextTabIndex(0, 'ArrowLeft', 3)).toBe(2)
  })

  it('jumps to the ends with Home and End', () => {
    expect(nextTabIndex(1, 'Home', 3)).toBe(0)
    expect(nextTabIndex(1, 'End', 3)).toBe(2)
  })

  it('ignores other keys and empty lists', () => {
    expect(nextTabIndex(0, 'Enter', 3)).toBeNull()
    expect(nextTabIndex(0, 'ArrowRight', 0)).toBeNull()
  })
})
