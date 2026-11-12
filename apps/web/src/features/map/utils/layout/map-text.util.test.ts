import { describe, expect, it } from 'vitest'
import { charsIn, stopLines, textWidth, wrapWords } from './map-text.util'

describe('wrapWords', () => {
  it('breaks at spaces within the budget', () => {
    expect(wrapWords('the syscall entry path', 12)).toEqual(['the syscall', 'entry path'])
  })

  it('gives an over-long word its own line', () => {
    expect(wrapWords('see arch/x86/entry/entry_64.S now', 10)).toEqual(['see', 'arch/x86/entry/entry_64.S', 'now'])
  })

  it('ends the last kept line in an ellipsis when lines run out', () => {
    expect(wrapWords('one two three four five', 8, 2)).toEqual(['one two', 'three…'])
  })
})

describe('stopLines', () => {
  it('keeps short titles on one line and balances long ones', () => {
    expect(stopLines('Power On', 14)).toEqual(['Power On'])
    expect(stopLines('An Address and a Name', 14)).toEqual(['An Address', 'and a Name'])
  })

  it('uses a third line in a narrow cell', () => {
    const lines = stopLines('A Gate That Counts Packets', 9)
    expect(lines.length).toBeLessThanOrEqual(3)
    expect(lines.every((line) => line.length <= 9 || !line.includes(' '))).toBe(true)
  })
})

describe('widths', () => {
  it('estimates widths and fits characters', () => {
    expect(textWidth('abcd', 6.4)).toBe(26)
    expect(charsIn(64, 6.4)).toBe(10)
    expect(charsIn(1, 6.4)).toBe(1)
  })
})
