import { useAppStore, useTourState } from '@app/store'
import { stopTour } from '@features/tour/utils/driver'
import type { TourScreen } from '@shared/types'
import { useEffect } from 'react'
import { useTour } from './useTour.hook'

/** Lets the screen settle (lazy chunk, fonts, focus on the h1) before a tour points at it. */
const SETTLE_MS = 700

/** `panels` changes when the mission opens a panel, so that panel gets its stop the first time it appears. */
export function useTourScreen(screen: TourScreen, panels = ''): void {
  const { setTourScreen } = useTourState()
  const { start } = useTour()

  useEffect(() => {
    setTourScreen(screen)
    return () => {
      // Clear only this screen's registration: another screen may have taken over by now.
      if (useAppStore.getState().tourScreen === screen) {
        setTourScreen(null)
      }
      stopTour()
    }
  }, [screen, setTourScreen])

  // biome-ignore lint/correctness/useExhaustiveDependencies: a newly opened panel re-checks for unseen stops
  useEffect(() => {
    const timer = window.setTimeout(() => start('auto'), SETTLE_MS)
    return () => window.clearTimeout(timer)
  }, [screen, panels, start])
}
