import type { HexColor } from '#types/definitions/palette'

/** WCAG 2.x AA minimum for normal-size text: every text pair in both prints meets it. */
export const AA_TEXT_RATIO = 4.5
/** WCAG 2.x minimum for non-text graphics and UI parts (SC 1.4.11). */
export const NON_TEXT_RATIO = 3

const HEX_PATTERN = /^#[0-9a-f]{6}$/i
const CHANNEL_MAX = 255
const SRGB_LINEAR_LIMIT = 0.04045
const SRGB_LINEAR_SLOPE = 12.92
const SRGB_OFFSET = 0.055
const SRGB_SCALE = 1.055
const SRGB_GAMMA = 2.4
const LUMINANCE_WEIGHTS = [0.2126, 0.7152, 0.0722] as const
/** Flare term in the WCAG contrast formula. */
const CONTRAST_FLARE = 0.05

export function hexToRgb(hex: HexColor): readonly [number, number, number] {
  if (!HEX_PATTERN.test(hex)) {
    throw new Error(`not a #rrggbb colour: ${hex}`)
  }
  const channel = (at: number) => Number.parseInt(hex.slice(at, at + 2), 16)
  return [channel(1), channel(3), channel(5)]
}

function linearChannel(value: number): number {
  const srgb = value / CHANNEL_MAX
  if (srgb <= SRGB_LINEAR_LIMIT) {
    return srgb / SRGB_LINEAR_SLOPE
  }
  return ((srgb + SRGB_OFFSET) / SRGB_SCALE) ** SRGB_GAMMA
}

/** Relative luminance of an sRGB colour, 0 (black) to 1 (white), as WCAG 2.x defines it. */
export function relativeLuminance(hex: HexColor): number {
  const [red, green, blue] = hexToRgb(hex).map(linearChannel) as [number, number, number]
  const [wr, wg, wb] = LUMINANCE_WEIGHTS
  return wr * red + wg * green + wb * blue
}

/** WCAG 2.x contrast ratio between two colours, from 1 to 21; the order does not matter. */
export function contrastRatio(foreground: HexColor, background: HexColor): number {
  const a = relativeLuminance(foreground)
  const b = relativeLuminance(background)
  const lighter = Math.max(a, b)
  const darker = Math.min(a, b)
  return (lighter + CONTRAST_FLARE) / (darker + CONTRAST_FLARE)
}
