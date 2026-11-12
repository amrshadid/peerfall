import type { TourMode, TourStop } from '@features/tour/types'

export interface StopFilter {
  readonly mode: TourMode
  /** Ids already shown to the player. */
  readonly seen: readonly string[]
  /** True when the stop's panel is on screen now. */
  readonly isPresent: (selector: string) => boolean
}

/**
 * The stops to play: only panels that are on screen (never one the story
 * hasn't opened yet) and, when starting on its own, only ones not seen before.
 */
export function stopsToShow(stops: readonly TourStop[], filter: StopFilter): readonly TourStop[] {
  const seen = new Set(filter.seen)
  return stops.filter((stop) => filter.isPresent(stop.selector) && (filter.mode === 'replay' || !seen.has(stop.id)))
}
