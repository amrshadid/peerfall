import { describe, expect, it } from 'vitest'
import { railLabelShown, railModeFor, stepStates } from './step-rail.util'

describe('railLabelShown', () => {
  it('labels every step in full mode', () => {
    expect(railLabelShown('full', 'future')).toBe(true)
  })

  it('labels only the current step in current mode', () => {
    expect(railLabelShown('current', 'current')).toBe(true)
    expect(railLabelShown('current', 'done')).toBe(false)
  })

  it('labels no step in marks mode', () => {
    expect(railLabelShown('marks', 'current')).toBe(false)
  })
})

describe('railModeFor', () => {
  it('keeps every label when they fit', () => {
    expect(railModeFor({ available: 420, full: 420, current: 260 })).toBe('full')
  })

  it('keeps only the current label when the full rail would overflow', () => {
    expect(railModeFor({ available: 300, full: 420, current: 260 })).toBe('current')
  })

  it('drops every label when even the current one does not fit', () => {
    expect(railModeFor({ available: 200, full: 420, current: 260 })).toBe('marks')
  })

  it('shows every label before the rail is laid out', () => {
    expect(railModeFor({ available: 0, full: 0, current: 0 })).toBe('full')
    expect(railModeFor({ available: 300, full: 0, current: 0 })).toBe('full')
  })
})

describe('stepStates', () => {
  it('fills the steps before the current one', () => {
    expect(stepStates(5, 2)).toEqual(['done', 'done', 'current', 'future', 'future'])
  })

  it('marks every step done once the mission is finished', () => {
    expect(stepStates(3, 3)).toEqual(['done', 'done', 'done'])
  })
})
