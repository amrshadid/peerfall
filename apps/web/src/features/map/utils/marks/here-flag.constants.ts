/** In drawing units. */
export const HERE_FLAG = {
  width: 96,
  height: 22,
  /** The pin under the flag, pointing at the stop. */
  pinWidth: 12,
  pinHeight: 8,
  /** Between the stop's red ring and the pin's tip. */
  gap: 5,
  /** From the flag's top to its label's baseline. */
  baseline: 16,
  /** Kept clear of the drawing's sides, so the flag never hangs over them. */
  margin: 2,
} as const

/** NodeMark's red ring stands this far outside the node's square. */
export const HERE_RING = 6
