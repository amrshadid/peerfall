import { getThemeConfig } from '#config'
import { DURATION_MS, EASING } from '#motion/motion.constants'
import { RULE_THIN_WIDTH_PX, RULE_WIDTH_PX } from '#spacing/spacing.constants'
import type { Palette, PaletteToken } from '#types/definitions/palette'
import { FONT_FACE, FONT_MONO } from '#typography/typography.constants'

export type CssVariables = Readonly<Record<`--${string}`, string>>

/** A palette as custom properties: `{ "--ink": "#141414", … }`. */
export function paletteVariables(palette: Palette): CssVariables {
  const tokens = Object.keys(palette) as PaletteToken[]
  return Object.fromEntries(tokens.map((token) => [`--${token}`, palette[token]]))
}

// Derived from DURATION_MS, so a new duration gets its `--t-<name>` property without a second edit.
const durationVariables = (): CssVariables =>
  Object.fromEntries(Object.entries(DURATION_MS).map(([name, ms]) => [`--t-${name}`, `${ms}ms`]))

/**
 * The custom properties that are the same in both prints: faces, rules, motion
 * and the UI scale (the configured default unless the player's is passed).
 */
export function sharedVariables(uiScale: number = getThemeConfig().defaultUiScale): CssVariables {
  return {
    '--face': FONT_FACE,
    '--mono': FONT_MONO,
    '--rule': `${RULE_WIDTH_PX}px solid var(--ink)`,
    '--rule-thin': `${RULE_THIN_WIDTH_PX}px solid var(--ink)`,
    ...durationVariables(),
    '--ease': EASING.standard,
    '--ease-in': EASING.in,
    '--ease-out': EASING.out,
    '--ui-scale': String(uiScale),
  }
}

/** Custom properties as CSS declarations, one per line: `--ink: #141414;`. */
export function toCssDeclarations(variables: CssVariables): string {
  return Object.entries(variables)
    .map(([name, value]) => `${name}: ${value};`)
    .join('\n')
}
