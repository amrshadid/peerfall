// @vitest-environment jsdom
import type { TourStop } from '@features/tour/types'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { TOUR_DRAWING } from './tour-driver.constants'
import { isOnScreen, tourConfig } from './tour-driver.util'

afterEach(() => {
  vi.restoreAllMocks()
  document.body.replaceChildren()
})

describe('tourConfig', () => {
  const stops: readonly TourStop[] = [
    { id: 'a', selector: '.a', title: 'A', text: 'a' },
    { id: 'b', selector: '.b', title: 'B', text: 'b', side: 'left', align: 'end' },
  ]

  const aimAt = vi.fn((_stop: TourStop, _index: number): Element => document.createElement('div'))

  it('asks for the aim only when a stop opens, so it is measured then', () => {
    const config = tourConfig(stops, true, aimAt)
    expect(aimAt).not.toHaveBeenCalled()
    const element = config.steps?.[1]?.element
    expect(typeof element === 'function' && element()).toBeInstanceOf(HTMLDivElement)
    expect(aimAt).toHaveBeenCalledWith(stops[1], 1)
  })

  it('dims with the paper ground and cuts out the aim exactly: square, no padding', () => {
    expect(tourConfig(stops, true, aimAt)).toMatchObject({
      overlayColor: 'var(--ground)',
      stageRadius: 0,
      stagePadding: 0,
      popoverOffset: TOUR_DRAWING.popoverOffsetPx,
      allowClose: true,
      allowKeyboardControl: true,
      showProgress: true,
      progressText: '{{current}} of {{total}}',
    })
  })

  it('offers Back from the second stop on, and no animation under reduced motion', () => {
    const config = tourConfig(stops, false, aimAt)
    expect(config.steps?.map((step) => step.popover?.showButtons)).toEqual([
      ['next', 'close'],
      ['next', 'previous', 'close'],
    ])
    expect(config.steps?.[1]?.popover).toMatchObject({ side: 'left', align: 'end' })
    expect(config.duration).toBe(0)
    expect(tourConfig(stops.slice(0, 1), true, aimAt).showProgress).toBe(false)
  })
})

describe('isOnScreen', () => {
  it('is true only for a panel that is there and has a size', () => {
    expect(isOnScreen('.missing')).toBe(false)
    const panel = document.body.appendChild(document.createElement('div'))
    panel.className = 'panel'
    // jsdom lays nothing out, so every box is empty until given one.
    expect(isOnScreen('.panel')).toBe(false)
    vi.spyOn(panel, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 100, 40))
    expect(isOnScreen('.panel')).toBe(true)
  })
})
