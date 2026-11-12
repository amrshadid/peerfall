import { describe, expect, it } from 'vitest'
import { DAY_PRINT } from '#palettes/day-print.palette'
import { NIGHT_PRINT } from '#palettes/night-print.palette'
import type { Palette, PaletteToken } from '#types/definitions/palette'
import { AA_TEXT_RATIO, contrastRatio, hexToRgb, NON_TEXT_RATIO, relativeLuminance } from '#utils/color/contrast.util'

interface BrandPair {
  readonly foreground: PaletteToken
  readonly background: PaletteToken
  /** The ratio docs/BRAND.md publishes for this pair. */
  readonly published: number
  /** Graphics (hatching) only need the non-text minimum. */
  readonly graphic?: true
}

/** BRAND.md rounds to two decimals. */
const PUBLISHED_TOLERANCE = 0.01

/** Every pair in docs/BRAND.md's Day print table. */
const DAY_PAIRS: readonly BrandPair[] = [
  { foreground: 'ink', background: 'sheet', published: 17.62 },
  { foreground: 'ink', background: 'ground', published: 15.83 },
  { foreground: 'ink', background: 'soft', published: 14.57 },
  { foreground: 'ink-2', background: 'sheet', published: 7.18 },
  { foreground: 'ink-2', background: 'soft', published: 5.93 },
  { foreground: 'red', background: 'sheet', published: 5.46 },
  { foreground: 'red', background: 'soft', published: 4.52 },
  { foreground: 'on-red', background: 'red', published: 5.46 },
  { foreground: 'blue', background: 'sheet', published: 7.42 },
  { foreground: 'green', background: 'sheet', published: 6.24 },
  { foreground: 'taint', background: 'sheet', published: 7.05 },
  { foreground: 'code-pre', background: 'sheet', published: 7.15 },
  { foreground: 'hatch', background: 'sheet', published: 3.32, graphic: true },
]

/** Every pair in docs/BRAND.md's Night print table. */
const NIGHT_PAIRS: readonly BrandPair[] = [
  { foreground: 'ink', background: 'sheet', published: 13.88 },
  { foreground: 'ink', background: 'ground', published: 15.16 },
  { foreground: 'ink', background: 'soft', published: 12.16 },
  { foreground: 'ink-2', background: 'sheet', published: 6.6 },
  { foreground: 'ink-2', background: 'soft', published: 5.78 },
  { foreground: 'red', background: 'sheet', published: 5.96 },
  { foreground: 'red', background: 'soft', published: 5.22 },
  { foreground: 'on-red', background: 'red', published: 6.55 },
  { foreground: 'ink', background: 'red-wash', published: 11.96 },
  { foreground: 'blue', background: 'sheet', published: 7.84 },
  { foreground: 'green', background: 'sheet', published: 8.82 },
  { foreground: 'taint', background: 'sheet', published: 6.61 },
  { foreground: 'code-pre', background: 'sheet', published: 9.92 },
  { foreground: 'hatch', background: 'sheet', published: 3.22, graphic: true },
]

describe.each([
  { print: 'Day print', palette: DAY_PRINT, pairs: DAY_PAIRS },
  { print: 'Night print', palette: NIGHT_PRINT, pairs: NIGHT_PAIRS },
])('$print', ({ palette, pairs }: { palette: Palette; pairs: readonly BrandPair[] }) => {
  it.each(pairs)('$foreground on $background meets WCAG AA', (pair) => {
    const minimum = pair.graphic ? NON_TEXT_RATIO : AA_TEXT_RATIO
    expect(contrastRatio(palette[pair.foreground], palette[pair.background])).toBeGreaterThanOrEqual(minimum)
  })

  it.each(pairs)('$foreground on $background matches BRAND.md ($published:1)', (pair) => {
    const ratio = contrastRatio(palette[pair.foreground], palette[pair.background])
    expect(Math.abs(ratio - pair.published)).toBeLessThanOrEqual(PUBLISHED_TOLERANCE)
  })
})

describe('contrastRatio', () => {
  it('spans 1:1 to 21:1 and ignores the order of its arguments', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5)
    expect(contrastRatio('#777777', '#777777')).toBe(1)
    expect(contrastRatio('#c8201a', '#fafaf7')).toBe(contrastRatio('#fafaf7', '#c8201a'))
  })
})

describe('relativeLuminance', () => {
  it('is 0 for black and 1 for white', () => {
    expect(relativeLuminance('#000000')).toBe(0)
    expect(relativeLuminance('#ffffff')).toBeCloseTo(1, 10)
  })
})

describe('hexToRgb', () => {
  it('reads either case and rejects anything but #rrggbb', () => {
    expect(hexToRgb('#1F4fa3')).toEqual([31, 79, 163])
    expect(() => hexToRgb('#fff')).toThrow()
  })
})
