export interface MarkPoint {
  readonly x: number
  readonly y: number
}

/** Where the flag may go, in the drawing's units. */
export interface FlagBounds {
  readonly left: number
  readonly right: number
  readonly top: number
}

/** The road through the stops: travelled up to the last stop reached, dashed on from there. */
export interface RoadShape {
  readonly reached: string
  readonly ahead: string
}
