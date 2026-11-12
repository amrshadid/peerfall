export interface MarkPoint {
  readonly x: number
  readonly y: number
}

/** A point of the road; `pencil` draws the stretch that arrives at it as planned, whatever is reached. */
export interface RoadPoint extends MarkPoint {
  readonly pencil: boolean
}

/** Where the flag may go, in the drawing's units. */
export interface FlagBounds {
  readonly left: number
  readonly right: number
  readonly top: number
}

/** The road through the stops: travelled up to the last stop reached, pencilled on from there. */
export interface RoadShape {
  readonly reached: string
  readonly ahead: string
}
