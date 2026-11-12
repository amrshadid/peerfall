import { useAppStore, useTourState } from '@app/store'
import type { TourMode } from '@features/tour/types'
import { isOnScreen, isTourActive, playTour } from '@features/tour/utils/driver'
import { stopsToShow, TOUR_STOPS } from '@features/tour/utils/stops'
import type { TourScreen } from '@shared/types'
import { useCallback } from 'react'

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)'

function wantsLessMotion(): boolean {
  return useAppStore.getState().motion === 'reduce' || window.matchMedia(REDUCED_MOTION).matches
}

// Stops shown count as seen even when skipped, so a tour starts on its own only once. Reads the
// store when called, not when rendered, so a delayed start sees the screen on show by then.
function startTour(mode: TourMode): void {
  const { tourScreen, toursSeen, markToursSeen } = useAppStore.getState()
  if (!tourScreen || isTourActive() || document.querySelector('dialog[open]')) {
    return
  }
  const stops = stopsToShow(TOUR_STOPS[tourScreen], { mode, seen: toursSeen, isPresent: isOnScreen })
  if (stops.length === 0) {
    return
  }
  markToursSeen(stops.map((stop) => stop.id))
  playTour(stops, !wantsLessMotion())
}

export interface UseTourResult {
  /** The screen on show, if it has a tour. */
  readonly screen: TourScreen | null
  /** Plays the current screen's tour; `auto` only plays stops not seen before. */
  readonly start: (mode: TourMode) => void
  /** Forgets which stops were seen, so every screen tours again. */
  readonly resetSeen: () => void
}

/** The current screen's guided tour: whether there is one, playing it, and forgetting what was seen. */
export function useTour(): UseTourResult {
  const { tourScreen, resetToursSeen } = useTourState()
  const start = useCallback((mode: TourMode) => startTour(mode), [])
  return { screen: tourScreen, start, resetSeen: resetToursSeen }
}
