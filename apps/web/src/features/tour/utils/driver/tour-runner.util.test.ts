// @vitest-environment jsdom
import type { StageBox } from '@features/tour/types'
import { TOUR_STOPS } from '@features/tour/utils/stops'
import type { TourScreen } from '@shared/types'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TOUR_AIM_CLASS, TOUR_AIM_SHOWN_CLASS } from './tour-driver.constants'
import { measureStage } from './tour-measure.util'
import { isTourActive, playTour, stopTour } from './tour-runner.util'
import { stageBox } from './tour-stage.util'

// jsdom lays nothing out: each panel gets a box of its own, inside the viewport so nothing scrolls.
const boxes = new Map<Element, StageBox>()

function rectOf(element: Element): DOMRect {
  // An aim is placed by inline style, so its box is what the runner wrote.
  const style = element instanceof HTMLElement && element.classList.contains(TOUR_AIM_CLASS) ? element.style : null
  const px = (value: string | undefined) => Number.parseFloat(value ?? '') || 0
  const box = style
    ? { top: px(style.top), left: px(style.left), width: px(style.width), height: px(style.height) }
    : (boxes.get(element) ?? { top: 0, left: 0, width: 0, height: 0 })
  return new DOMRect(box.left, box.top, box.width, box.height)
}

// Builds from the selector so every real stop gets a target, whatever its shape.
function panel(selector: string, index: number): Element {
  const [outer = '', inner] = selector.split(' ')
  const tag = /^[a-z]+/.exec(outer)?.[0] ?? 'div'
  let element = document.createElement(tag)
  const id = /#([\w-]+)/.exec(outer)?.[1]
  const className = /\.([\w-]+)/.exec(outer)?.[1]
  if (id) {
    element.id = id
  }
  if (className) {
    element.className = className
  }
  document.body.append(element)
  const attribute = inner && /^\[([\w-]+)\]$/.exec(inner)?.[1]
  if (attribute) {
    const child = element.appendChild(document.createElement('button'))
    child.setAttribute(attribute, '')
    element = child
  }
  boxes.set(element, { top: 40 + index * 30, left: 20 + index * 10, width: 300 + index, height: 120 + index * 2 })
  return element
}

/** The cut-out in driver.js's overlay: the second subpath, `M x,y h w … v h …`. */
function cutOut(): StageBox {
  const d = document.querySelector('.driver-overlay path')?.getAttribute('d') ?? ''
  const hole = /M(-?[\d.]+),(-?[\d.]+) h(-?[\d.]+)[^v]*v(-?[\d.]+)/.exec(d.split('Z')[1] ?? '')
  const [left, top, width, height] = (hole?.slice(1) ?? []).map(Number)
  return { top: top ?? Number.NaN, left: left ?? Number.NaN, width: width ?? Number.NaN, height: height ?? Number.NaN }
}

function shownAim(): StageBox | null {
  const aims = document.querySelectorAll(`.${TOUR_AIM_SHOWN_CLASS}`)
  if (aims.length !== 1) {
    return null
  }
  const { top, left, width, height } = rectOf(aims[0] as Element)
  return { top, left, width, height }
}

const settle = () => vi.advanceTimersByTime(100)

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'setTimeout', 'Date'] })
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
    return rectOf(this)
  })
  Element.prototype.scrollIntoView = vi.fn()
})

afterEach(() => {
  stopTour()
  settle()
  vi.useRealTimers()
  vi.restoreAllMocks()
  boxes.clear()
  document.body.replaceChildren()
})

describe('playTour', () => {
  it.each(Object.keys(TOUR_STOPS) as TourScreen[])('cuts out exactly what each %s stop draws its line on', (screen) => {
    const stops = TOUR_STOPS[screen]
    const targets = stops.map((stop, index) => panel(stop.selector, index))
    playTour(stops, false)
    settle()

    targets.forEach((target, index) => {
      const expected = stageBox(measureStage(target))
      expect(cutOut(), stops[index]?.id).toEqual(expected)
      expect(shownAim(), stops[index]?.id).toEqual(expected)
      document.querySelector<HTMLButtonElement>('.driver-popover-next-btn')?.click()
      settle()
    })
    expect(isTourActive()).toBe(false)
  })

  it('draws one line on the target, with no frame around it', () => {
    const [stop] = TOUR_STOPS.mission
    if (!stop) {
      throw new Error('the level has no tour')
    }
    const target = panel(stop.selector, 0)
    playTour([stop], false)
    settle()

    expect(document.querySelector('.pf-tour-frame')).toBeNull()
    const added = [...document.body.children].filter(
      (element) => element !== target && !element.matches('.driver-overlay, .driver-popover, [class^="driver-"]')
    )
    expect(added).toHaveLength(1)
    expect(added[0]?.classList.contains(TOUR_AIM_SHOWN_CLASS)).toBe(true)
    // Never outside the target: with no rule around it, only the even padding.
    const box = boxes.get(target) as StageBox
    expect(shownAim()).toEqual({
      top: box.top - 6,
      left: box.left - 6,
      width: box.width + 12,
      height: box.height + 12,
    })
  })

  it('keeps a target on the viewport edge fully on screen', () => {
    const stop = TOUR_STOPS.mission.find((s) => s.id === 'mission:status')
    if (!stop) {
      throw new Error('the level has no status stop')
    }
    const bar = panel(stop.selector, 0)
    boxes.set(bar, { top: window.innerHeight - 32, left: 0, width: window.innerWidth, height: 32 })
    playTour([stop], false)
    settle()

    const visible = { top: window.innerHeight - 38, left: 0, width: window.innerWidth, height: 38 }
    expect(cutOut()).toEqual(visible)
    expect(shownAim()).toEqual(visible)
  })

  it('follows a panel that moves or resizes while it is on show', () => {
    const [stop] = TOUR_STOPS.title
    if (!stop) {
      throw new Error('the map has no tour')
    }
    const element = panel(stop.selector, 0)
    playTour([stop], false)
    settle()

    boxes.set(element, { top: 200, left: 50, width: 420, height: 90 })
    settle()
    const expected = stageBox(measureStage(element))
    expect(cutOut()).toEqual(expected)
    expect(shownAim()).toEqual(expected)
  })

  it('leaves nothing behind once closed', () => {
    const [stop] = TOUR_STOPS.title
    if (!stop) {
      throw new Error('the map has no tour')
    }
    panel(stop.selector, 0)
    playTour([stop], false)
    settle()
    expect(document.querySelector('.driver-active-element')).not.toBeNull()

    stopTour()
    settle()
    expect(isTourActive()).toBe(false)
    expect(document.body.className).not.toMatch(/driver/)
    expect(document.querySelector('.driver-overlay, .driver-popover, .driver-active-element')).toBeNull()
    expect(document.querySelector(`.${TOUR_AIM_CLASS}`)).toBeNull()
  })
})
