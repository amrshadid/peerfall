/** A box in viewport px, the space driver.js draws its overlay in. */
export interface StageBox {
  readonly top: number
  readonly left: number
  readonly width: number
  readonly height: number
}

/** Border widths, or a box's edges. */
export interface BoxSides {
  readonly top: number
  readonly right: number
  readonly bottom: number
  readonly left: number
}

export interface StageInput {
  readonly box: StageBox
  readonly border: BoxSides
  /** A stretched target with no rules is framed around what it shows. */
  readonly content: StageBox | null
  readonly rules: readonly StageBox[]
  /** The sheet's border box, which a highlight never runs past. */
  readonly frame: StageBox | null
  readonly viewport: StageBox
  readonly padding: number
}
