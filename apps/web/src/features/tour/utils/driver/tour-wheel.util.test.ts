// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { passWheelThrough } from './tour-wheel.util'

// jsdom lays nothing out: sizes and the hit test are set by hand.
function scrollingList(): HTMLElement {
  const list = document.createElement('div')
  list.style.overflowY = 'auto'
  Object.defineProperty(list, 'scrollHeight', { value: 900 })
  Object.defineProperty(list, 'clientHeight', { value: 300 })
  list.scrollBy = vi.fn() as typeof list.scrollBy
  return list
}

let stop = () => {}
let hit: Element[] = []
let activeWhileHit: boolean[] = []

beforeEach(() => {
  hit = []
  activeWhileHit = []
  document.body.classList.add('driver-active')
  document.elementsFromPoint = () => {
    activeWhileHit.push(document.body.classList.contains('driver-active'))
    return hit
  }
  stop = passWheelThrough()
})

afterEach(() => {
  stop()
  document.body.className = ''
  document.body.replaceChildren()
})

const wheel = (target: EventTarget, init: WheelEventInit) =>
  target.dispatchEvent(new WheelEvent('wheel', { bubbles: true, clientX: 10, clientY: 10, ...init }))

describe('passWheelThrough', () => {
  it('scrolls the list under the pointer, which the tour would otherwise swallow', () => {
    const list = scrollingList()
    const row = list.appendChild(document.createElement('p'))
    document.body.append(list)
    hit = [row, list, document.body]
    wheel(document.documentElement, { deltaY: 120 })
    expect(list.scrollBy).toHaveBeenCalledWith({ top: 120 })
    // The page is hit as drawn, without driver.js's pointer-events rule, and it is put back after.
    expect(activeWhileHit).toEqual([false])
    expect(document.body.classList.contains('driver-active')).toBe(true)
  })

  it("passes over the tour's own overlay to what lies under it", () => {
    const list = scrollingList()
    const overlay = document.createElement('div')
    overlay.className = 'pf-tour-aim'
    document.body.append(list, overlay)
    hit = [overlay, list]
    wheel(document.documentElement, { deltaY: 3, deltaMode: WheelEvent.DOM_DELTA_LINE })
    expect(list.scrollBy).toHaveBeenCalledWith({ top: 48 })
  })

  it('leaves a wheel over the popover to the popover', () => {
    const list = scrollingList()
    const popover = document.createElement('div')
    popover.className = 'driver-popover'
    document.body.append(list, popover)
    hit = [list]
    wheel(popover, { deltaY: 120 })
    expect(list.scrollBy).not.toHaveBeenCalled()
  })

  it('stops once the tour is gone', () => {
    const list = scrollingList()
    document.body.append(list)
    hit = [list]
    stop()
    wheel(document.documentElement, { deltaY: 120 })
    expect(list.scrollBy).not.toHaveBeenCalled()
  })
})
