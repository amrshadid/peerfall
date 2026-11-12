// @vitest-environment jsdom

import { journeyFixture, longerJourneyFixture, SECOND_MISSION } from '@features/map/utils/fixtures'
import { journeyChapters } from '@features/map/utils/journey'
import { HERE_AT } from '@features/map/utils/layout'
import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useMapGauge } from './useMapGauge.hook'

const WIDTH = 774
const HEIGHT = 600

function scrollBox(): HTMLDivElement {
  const element = document.createElement('div')
  Object.defineProperty(element, 'clientWidth', { value: WIDTH })
  Object.defineProperty(element, 'clientHeight', { value: HEIGHT })
  Object.defineProperty(element, 'scrollTop', { value: 0, writable: true })
  element.scrollTo = vi.fn() as typeof element.scrollTo
  return element
}

beforeEach(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    }
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
})

function setup(chapters = journeyChapters(longerJourneyFixture(true), SECOND_MISSION)) {
  const element = scrollBox()
  const hook = renderHook(() => useMapGauge(chapters, true))
  act(() => hook.result.current.scrollerRef(element))
  return { hook, element, chapters }
}

describe('useMapGauge', () => {
  it('lays the drawing out at the scroller width and scrolls to "You are here" once', () => {
    const { hook, element } = setup()
    const scene = hook.result.current.scene
    expect(scene?.width).toBe(WIDTH)
    const hereY = scene?.here?.y ?? 0
    expect(element.scrollTo).toHaveBeenCalledTimes(1)
    expect(element.scrollTo).toHaveBeenCalledWith({
      top: Math.max(0, Math.round(hereY - HEIGHT * HERE_AT)),
      behavior: 'instant',
    })
    expect(hook.result.current.gaugeStages).toHaveLength(11)
    expect(hook.result.current.here).toBeGreaterThan(0)
  })

  it('stays at the top and has no "You" mark when the player stands nowhere', () => {
    const { hook, element } = setup(journeyChapters(journeyFixture('completed'), null))
    expect(element.scrollTo).not.toHaveBeenCalled()
    expect(hook.result.current.here).toBeNull()
  })

  it('jumps to a stage top, a planned one too, and keeps a focused stop in view', () => {
    const { hook, element } = setup()
    const scene = hook.result.current.scene
    const planned = scene?.chapters[8]
    vi.mocked(element.scrollTo).mockClear()

    act(() => hook.result.current.jumpTo(planned?.id ?? ''))
    expect(element.scrollTo).toHaveBeenCalledWith({ top: Math.round(planned?.top ?? 0), behavior: 'instant' })

    vi.mocked(element.scrollTo).mockClear()
    const far = scene?.stops[scene.stops.length - 1]
    if (!far) {
      throw new Error('the fixture has stops')
    }
    // The view is still at the top, and stage 4 lies below it.
    act(() => hook.result.current.keepInView(far))
    expect(element.scrollTo).toHaveBeenCalledTimes(1)

    element.scrollTop = far.y - HEIGHT / 2
    vi.mocked(element.scrollTo).mockClear()
    act(() => hook.result.current.keepInView(far))
    expect(element.scrollTo).not.toHaveBeenCalled()
  })
})
