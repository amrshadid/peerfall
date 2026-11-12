import { type Driver, driver } from 'driver.js'
import 'driver.js/dist/driver.css'
import '@shared/styles/tour.css'
import type { StageBox, TourStop } from '@features/tour/types'
import { TOUR_AIM_CLASS, TOUR_AIM_SHOWN_CLASS } from './tour-driver.constants'
import { tourConfig } from './tour-driver.util'
import { measureStage } from './tour-measure.util'
import { boxStyle, sameBox, stageBox } from './tour-stage.util'

// driver.js is imperative and draws over the whole page, so the one running tour lives here, outside React.
let active: Driver | null = null

export function isTourActive(): boolean {
  return active?.isActive() === true
}

export function stopTour(): void {
  active?.destroy()
}

function bringIntoView(target: Element): void {
  const box = target.getBoundingClientRect()
  if (box.top < 0 || box.left < 0 || box.bottom > window.innerHeight || box.right > window.innerWidth) {
    target.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }
}

// driver.js cuts around an element's own box, which misses shared rules and the viewport edge, so it gets a stand-in.
function createAims() {
  const aims = new Map<number, HTMLElement>()
  const targets = new WeakMap<Element, Element>()
  const aimFor = (index: number): HTMLElement => {
    const existing = aims.get(index)
    if (existing) {
      return existing
    }
    const aim = document.createElement('div')
    aim.className = TOUR_AIM_CLASS
    aim.setAttribute('aria-hidden', 'true')
    document.body.append(aim)
    aims.set(index, aim)
    return aim
  }
  const stageOf = (target: Element): StageBox => stageBox(measureStage(target))
  return {
    stageOf,
    aimAt(stop: TourStop, index: number): Element {
      const aim = aimFor(index)
      const target = document.querySelector(stop.selector)
      if (target) {
        bringIntoView(target)
        targets.set(aim, target)
      }
      const center = { top: window.innerHeight / 2, left: window.innerWidth / 2, width: 0, height: 0 }
      Object.assign(aim.style, boxStyle(target ? stageOf(target) : center))
      return aim
    },
    targetOf: (aim: Element) => targets.get(aim),
    removeAll() {
      for (const aim of aims.values()) {
        aim.remove()
      }
      aims.clear()
    },
  }
}

// Every frame: driver.js re-measures only on resize and scroll, but panels move with drags, fonts and inner scrolls.
function followStage(tour: Driver, aim: HTMLElement, target: Element, stageOf: (target: Element) => StageBox) {
  let last = target.getBoundingClientRect()
  let lastViewport = [window.innerWidth, window.innerHeight].join()
  let frame = requestAnimationFrame(function check() {
    const now = target.getBoundingClientRect()
    const viewport = [window.innerWidth, window.innerHeight].join()
    if (!sameBox(now, last) || viewport !== lastViewport) {
      last = now
      lastViewport = viewport
      Object.assign(aim.style, boxStyle(stageOf(target)))
      tour.refresh()
    }
    frame = requestAnimationFrame(check)
  })
  return () => cancelAnimationFrame(frame)
}

export function playTour(stops: readonly TourStop[], animate: boolean): void {
  const returnTo = document.activeElement instanceof HTMLElement ? document.activeElement : null
  const aims = createAims()
  let stopFollowing = () => {}
  const tour = driver({
    ...tourConfig(stops, animate, aims.aimAt),
    onPopoverRender: (popover) => {
      popover.wrapper.setAttribute('aria-modal', 'true')
      // driver.js focuses the first control, the close mark; Next is the likelier key.
      requestAnimationFrame(() => popover.nextButton.focus())
    },
    onHighlighted: (aim) => {
      const target = aim && aims.targetOf(aim)
      if (aim instanceof HTMLElement && target) {
        aim.classList.add(TOUR_AIM_SHOWN_CLASS)
        stopFollowing = followStage(tour, aim, target, aims.stageOf)
      }
    },
    // The line goes while the cut-out glides on, so it never fights driver.js's own animation.
    onDeselected: (aim) => {
      stopFollowing()
      aim?.classList.remove(TOUR_AIM_SHOWN_CLASS)
    },
    onDestroyed: () => {
      stopFollowing()
      aims.removeAll()
      active = null
      if (returnTo?.isConnected) {
        requestAnimationFrame(() => returnTo.focus({ preventScroll: true }))
      }
    },
  })
  active = tour
  tour.drive()
}
