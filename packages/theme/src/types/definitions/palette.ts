/** A colour as `#rrggbb`. */
export type HexColor = `#${string}`

/**
 * One print of the Section 2 palette. Keys are the CSS custom-property names
 * without the leading `--`, exactly as docs/BRAND.md names them.
 */
export interface Palette {
  /** The desk the sheets lie on. */
  readonly ground: HexColor
  /** Panels and the editor. */
  readonly sheet: HexColor
  /** Terminal paper and table headers: one tone step from the sheet. */
  readonly soft: HexColor
  /** Text, rules and solid fills. */
  readonly ink: HexColor
  /** Secondary text. */
  readonly 'ink-2': HexColor
  /** The one accent: primary action, you-are-here, current step, open objective. */
  readonly red: HexColor
  /** Text and icons on a red fill (the primary button). */
  readonly 'on-red': HexColor
  /** A highlighted row. */
  readonly 'red-wash': HexColor
  /** Links, the focus ring, X-ray data arrows. */
  readonly blue: HexColor
  /** Passed, saved, clean. */
  readonly green: HexColor
  /** Taint ("errata" magenta). */
  readonly taint: HexColor
  /** Cross-hatching; decorative, never text. */
  readonly hatch: HexColor
  /** The deepest fill, darker than the ground in both prints. */
  readonly slot: HexColor
  readonly 'code-kw': HexColor
  readonly 'code-type': HexColor
  readonly 'code-str': HexColor
  readonly 'code-com': HexColor
  readonly 'code-pre': HexColor
  readonly 'code-num': HexColor
}

export type PaletteToken = keyof Palette

/** The two prints: Day (light, the default) and Night (dark). */
export type PrintName = 'day' | 'night'
