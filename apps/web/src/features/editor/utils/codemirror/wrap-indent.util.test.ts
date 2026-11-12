import { describe, expect, it } from 'vitest'
import { hangColumns, leadingColumns } from './wrap-indent.util'

describe('hangColumns', () => {
  it('continues one tab stop past the indentation, always on a tab stop', () => {
    expect(hangColumns(0, 8)).toBe(8)
    expect(hangColumns(16, 8)).toBe(24)
    expect(hangColumns(14, 8)).toBe(16)
  })
})

describe('leadingColumns', () => {
  it('counts tabs to the next stop and spaces as one column', () => {
    expect(leadingColumns('\t\treturn 0;', 8)).toBe(16)
    expect(leadingColumns('  \tx', 8)).toBe(8)
    expect(leadingColumns('\t      strerror(errno));', 8)).toBe(14)
  })

  it('is zero for unindented and empty lines', () => {
    expect(leadingColumns('int main(void)', 8)).toBe(0)
    expect(leadingColumns('', 8)).toBe(0)
  })
})
