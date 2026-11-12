import { MAX_CELL, MIN_CELL, PAD, ROW_INSET } from './map-layout.constants'

/** Splits `nodes` into balanced rows of at most `perRow`. */
export function rowsOf<T>(nodes: readonly T[], perRow: number): readonly (readonly T[])[] {
  if (nodes.length === 0) {
    return []
  }
  const count = Math.ceil(nodes.length / Math.max(1, perRow))
  const size = Math.ceil(nodes.length / count)
  const rows: T[][] = []
  for (let at = 0; at < nodes.length; at += size) {
    rows.push(nodes.slice(at, at + size))
  }
  return rows
}

/** Where the stops of a row of `count` sit, left to right, and how wide each one's cell is. */
export function cellsOf(count: number, width: number): { readonly xs: readonly number[]; readonly cell: number } {
  const left = PAD + ROW_INSET
  const track = width - 2 * left
  const cell = Math.min(MAX_CELL, track / Math.max(1, count))
  const start = left + (track - cell * count) / 2
  return { xs: Array.from({ length: count }, (_, index) => Math.round(start + cell * (index + 0.5))), cell }
}

export function perRowAt(width: number): number {
  return Math.max(1, Math.floor((width - 2 * (PAD + ROW_INSET)) / MIN_CELL))
}
