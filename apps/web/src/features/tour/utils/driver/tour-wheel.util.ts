import { TOUR_AIM_CLASS } from './tour-driver.constants'

/** driver.js's popover: a wheel over it scrolls its own text. */
const POPOVER_SELECTOR = '.driver-popover'
/** Drawn over the page by driver.js and by the tour: never what a wheel means to scroll. */
const OVERLAY_SELECTOR = `.driver-overlay, .${TOUR_AIM_CLASS}`
const ACTIVE_CLASS = 'driver-active'
const LINE_PX = 16
const SCROLLS: readonly string[] = ['auto', 'scroll', 'overlay']

function pixels(delta: number, mode: number, page: number): number {
  if (mode === WheelEvent.DOM_DELTA_LINE) {
    return delta * LINE_PX
  }
  if (mode === WheelEvent.DOM_DELTA_PAGE) {
    return delta * page
  }
  return delta
}

function scrollsDown(element: Element): boolean {
  return SCROLLS.includes(getComputedStyle(element).overflowY) && element.scrollHeight > element.clientHeight
}

function scrollsAcross(element: Element): boolean {
  return SCROLLS.includes(getComputedStyle(element).overflowX) && element.scrollWidth > element.clientWidth
}

// driver.js turns the pointer off on everything but its popover, so the browser finds nothing to
// scroll under the wheel. With its class lifted for one synchronous look the page is hit as drawn;
// nothing is painted in between.
function pageUnder(x: number, y: number): readonly Element[] {
  const body = document.body
  const active = body.classList.contains(ACTIVE_CLASS)
  if (active) {
    body.classList.remove(ACTIVE_CLASS)
  }
  try {
    return document.elementsFromPoint(x, y).filter((element) => element.closest(OVERLAY_SELECTOR) === null)
  } finally {
    if (active) {
      body.classList.add(ACTIVE_CLASS)
    }
  }
}

/** The box a wheel at (x, y) would scroll without the tour over the page; null when there is none. */
export function scrollerUnder(x: number, y: number, across: boolean): Element | null {
  for (let element: Element | null = pageUnder(x, y)[0] ?? null; element; element = element.parentElement) {
    if (across ? scrollsAcross(element) : scrollsDown(element)) {
      return element
    }
  }
  return null
}

/**
 * While a tour is up the wheel still scrolls the page under it (a list, the map), as it would
 * without the tour; over the popover it is left alone. Returns the way to stop.
 */
export function passWheelThrough(): () => void {
  const onWheel = (event: WheelEvent) => {
    if (event.target instanceof Element && event.target.closest(POPOVER_SELECTOR) !== null) {
      return
    }
    const across = Math.abs(event.deltaX) > Math.abs(event.deltaY)
    const scroller = scrollerUnder(event.clientX, event.clientY, across)
    if (!scroller) {
      return
    }
    const page = across ? scroller.clientWidth : scroller.clientHeight
    const delta = pixels(across ? event.deltaX : event.deltaY, event.deltaMode, page)
    scroller.scrollBy(across ? { left: delta } : { top: delta })
  }
  document.addEventListener('wheel', onWheel, { passive: true, capture: true })
  return () => document.removeEventListener('wheel', onWheel, { capture: true })
}
