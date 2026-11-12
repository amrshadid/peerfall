import { describe, expect, it } from 'vitest'
import { walkTarget } from './map-walk.util'

// Stages b and d have no missions: the road crosses them without a stop.
const STAGES = ['a', 'b', 'c', 'd', 'e']
const STOPS = [{ chapterId: 'a' }, { chapterId: 'a' }, { chapterId: 'c' }, { chapterId: 'c' }, { chapterId: 'e' }]

const walk = (key: string, index: number) => walkTarget(key, index, STOPS, STAGES)

describe('walkTarget', () => {
  it('walks the road one stop at a time with the arrow keys, across stages', () => {
    expect(walk('ArrowRight', 0)).toBe(1)
    expect(walk('ArrowDown', 1)).toBe(2)
    expect(walk('ArrowLeft', 2)).toBe(1)
    expect(walk('ArrowUp', 4)).toBe(3)
  })

  it('stops at the ends of the road', () => {
    expect(walk('ArrowUp', 0)).toBe(0)
    expect(walk('ArrowDown', 4)).toBe(4)
  })

  it('goes to the first and last stop with Home and End', () => {
    expect(walk('Home', 3)).toBe(0)
    expect(walk('End', 1)).toBe(4)
  })

  it('changes stage with Page Up and Page Down, skipping stages with no missions', () => {
    expect(walk('PageDown', 0)).toBe(2)
    expect(walk('PageDown', 3)).toBe(4)
    expect(walk('PageUp', 4)).toBe(2)
    expect(walk('PageUp', 3)).toBe(0)
  })

  it('stays put when there is no stage with missions that way', () => {
    expect(walk('PageUp', 1)).toBe(1)
    expect(walk('PageDown', 4)).toBe(4)
  })

  it('leaves every other key alone', () => {
    expect(walk('Enter', 0)).toBeNull()
    expect(walk(' ', 0)).toBeNull()
    expect(walk('Tab', 0)).toBeNull()
  })
})
