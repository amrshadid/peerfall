import type { TourStop } from '@features/tour/types'
import type { Config } from 'driver.js'
import { TOUR_DRAWING, TOUR_POPOVER_CLASS, TOUR_PROGRESS_TEXT } from './tour-driver.constants'

/** Called as each stop opens, so the target is measured where it is then. */
export type AimAt = (stop: TourStop, index: number) => Element

/** driver.js's options for `stops`, apart from the hooks that reach the page. */
export function tourConfig(stops: readonly TourStop[], animate: boolean, aimAt: AimAt): Config {
  return {
    steps: stops.map((stop, index) => ({
      element: () => aimAt(stop, index),
      popover: {
        title: stop.title,
        description: stop.text,
        side: stop.side ?? 'bottom',
        align: stop.align ?? 'start',
        // No greyed-out Back on the first stop: a disabled button only adds noise.
        showButtons: index === 0 ? ['next', 'close'] : ['next', 'previous', 'close'],
      },
    })),
    animate,
    duration: animate ? TOUR_DRAWING.durationMs : 0,
    smoothScroll: false,
    allowClose: true,
    allowKeyboardControl: true,
    disableActiveInteraction: true,
    showProgress: stops.length > 1,
    progressText: TOUR_PROGRESS_TEXT,
    nextBtnText: 'Next',
    prevBtnText: 'Back',
    doneBtnText: 'Done',
    closeBtnLabel: 'Skip the tour (Esc)',
    popoverClass: TOUR_POPOVER_CLASS,
    overlayColor: TOUR_DRAWING.overlayColor,
    overlayOpacity: TOUR_DRAWING.overlayOpacity,
    // The aim already is the exact box; driver.js's padding would push the cut-out past the rules.
    stagePadding: 0,
    stageRadius: 0,
    popoverOffset: TOUR_DRAWING.popoverOffsetPx,
  }
}

/** A hidden panel can't be pointed at. */
export function isOnScreen(selector: string): boolean {
  const element = document.querySelector(selector)
  if (!element) {
    return false
  }
  const box = element.getBoundingClientRect()
  return box.width > 0 && box.height > 0
}
