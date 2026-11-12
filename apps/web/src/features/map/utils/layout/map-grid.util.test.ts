import { describe, expect, it } from 'vitest'
import { cellsOf, perRowAt, rowsOf } from './map-grid.util'
import { MAX_CELL, PAD } from './map-layout.constants'

describe('rowsOf', () => {
  it('splits into balanced rows of at most perRow', () => {
    expect(rowsOf([1, 2, 3, 4, 5, 6], 4).map((row) => row.length)).toEqual([3, 3])
    expect(rowsOf([1, 2, 3, 4, 5], 5)).toHaveLength(1)
  })

  it('returns no rows for no nodes', () => {
    expect(rowsOf([], 4)).toEqual([])
  })
})

describe('cellsOf', () => {
  it('centres the cells of a short row and caps their width', () => {
    const { xs, cell } = cellsOf(2, 1340)
    expect(cell).toBe(MAX_CELL)
    expect(Math.round(((xs[0] ?? 0) + (xs[1] ?? 0)) / 2)).toBe(670)
    expect(cellsOf(5, 470).xs[0]).toBeGreaterThan(PAD)
  })
})

describe('perRowAt', () => {
  it('fits fewer stops in a narrow row, never none', () => {
    expect(perRowAt(470)).toBeLessThan(perRowAt(1340))
    expect(perRowAt(0)).toBe(1)
  })
})
