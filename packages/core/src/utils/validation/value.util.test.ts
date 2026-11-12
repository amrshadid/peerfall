import { describe, expect, it } from 'vitest'
import { describeType, isRecord, joinPath } from '#utils/validation/value.util'

describe('isRecord', () => {
  it('accepts plain objects only', () => {
    expect(isRecord({ a: 1 })).toBe(true)
    expect(isRecord(null)).toBe(false)
    expect(isRecord([1])).toBe(false)
    expect(isRecord('text')).toBe(false)
  })
})

describe('describeType', () => {
  it("names a value's type for an error message", () => {
    expect(describeType(null)).toBe('null')
    expect(describeType([])).toBe('a list')
    expect(describeType(3)).toBe('a number')
    expect(describeType(true)).toBe('a boolean')
  })

  it('uses the right article and plain words for text and a missing value', () => {
    expect(describeType({})).toBe('an object')
    expect(describeType(undefined)).toBe('nothing')
    expect(describeType('fork')).toBe('text')
    expect(describeType('  ')).toBe('empty text')
  })
})

describe('joinPath', () => {
  it('joins object keys with dots and list indexes with brackets', () => {
    expect(joinPath('', 'hints')).toBe('hints')
    expect(joinPath('hints', 'nudge')).toBe('hints.nudge')
    expect(joinPath('codex', 2)).toBe('codex[2]')
  })
})
