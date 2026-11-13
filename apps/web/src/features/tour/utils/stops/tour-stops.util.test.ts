import { MISSION_STEPS } from '@features/mission/utils/layout'
import type { TourStop } from '@features/tour/types'
import { describe, expect, it } from 'vitest'
import { MAX_STOP_TEXT_LENGTH, TOUR_STOPS } from './tour-stops.constants'
import { stopsToShow } from './tour-stops.util'

const stop = (id: string, selector: string): TourStop => ({ id, selector, title: id, text: id })

const STOPS = [
  stop('mission:guide', '#mission-guide'),
  stop('mission:editor', '#mission-editor'),
  stop('mission:terminal', '#mission-terminal'),
  stop('mission:topology', '#mission-topology'),
]

const onScreen =
  (...selectors: string[]) =>
  (selector: string) =>
    selectors.includes(selector)

describe('stopsToShow', () => {
  it("never shows a panel the mission hasn't opened yet", () => {
    const shown = stopsToShow(STOPS, {
      mode: 'auto',
      seen: [],
      isPresent: onScreen('#mission-guide', '#mission-terminal'),
    })
    expect(shown.map((s) => s.id)).toEqual(['mission:guide', 'mission:terminal'])
  })

  it('starts on its own only for stops not seen yet, such as a panel that just appeared', () => {
    const shown = stopsToShow(STOPS, {
      mode: 'auto',
      seen: ['mission:guide', 'mission:terminal'],
      isPresent: onScreen('#mission-guide', '#mission-terminal', '#mission-topology'),
    })
    expect(shown.map((s) => s.id)).toEqual(['mission:topology'])
  })

  it('has nothing to start once every stop on screen was seen', () => {
    const shown = stopsToShow(STOPS, {
      mode: 'auto',
      seen: ['mission:guide'],
      isPresent: onScreen('#mission-guide'),
    })
    expect(shown).toEqual([])
  })

  it('replays every stop on screen, seen or not', () => {
    const shown = stopsToShow(STOPS, {
      mode: 'replay',
      seen: STOPS.map((s) => s.id),
      isPresent: onScreen('#mission-guide', '#mission-editor'),
    })
    expect(shown.map((s) => s.id)).toEqual(['mission:guide', 'mission:editor'])
  })
})

describe('TOUR_STOPS', () => {
  it('uses unique ids prefixed with their screen', () => {
    for (const [screen, stops] of Object.entries(TOUR_STOPS)) {
      const ids = stops.map((s) => s.id)
      expect(new Set(ids).size).toBe(ids.length)
      expect(ids.every((id) => id.startsWith(`${screen}:`))).toBe(true)
    }
  })

  it('keeps each stop to one short sentence or two', () => {
    for (const stops of Object.values(TOUR_STOPS)) {
      for (const s of stops) {
        expect(s.text.length).toBeLessThanOrEqual(MAX_STOP_TEXT_LENGTH)
      }
    }
  })

  it('tours every panel of the mission workspace', () => {
    const selectors = TOUR_STOPS.mission.map((s) => s.selector)
    for (const panel of ['guide', 'terminal', 'editor', 'topology', 'timeline']) {
      expect(selectors).toContain(`#mission-${panel}`)
    }
  })

  it('names the steps as the step rail shows them, in its order', () => {
    const text = TOUR_STOPS.mission.find((s) => s.id === 'mission:steps')?.text ?? ''
    expect(text.startsWith(`${MISSION_STEPS.map((step) => step.label).join(', ')}.`)).toBe(true)
  })
})
