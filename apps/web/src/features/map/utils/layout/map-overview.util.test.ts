import { FIRST_MISSION, journeyFixture, longerJourneyFixture, SECOND_MISSION } from '@features/map/utils/fixtures'
import { journeyChapters } from '@features/map/utils/journey'
import { describe, expect, it } from 'vitest'
import { OVERVIEW_HERE_AT } from './map-layout.constants'
import { layoutMap } from './map-layout.util'
import { overviewDescription, overviewWindow } from './map-overview.util'

describe('overviewWindow', () => {
  const scene = layoutMap(journeyChapters(journeyFixture(), FIRST_MISSION), 460, 'overview')

  it('puts "you" a little above the middle and fades the edges that hide more drawing', () => {
    const shown = overviewWindow(scene, 400)
    expect(shown.top).toBe(Math.round((scene.here?.y ?? 0) - 400 * OVERVIEW_HERE_AT))
    expect(shown).toMatchObject({ height: 400, fadeTop: true, fadeBottom: true })
  })

  it('starts at the top of the sheet when the player stands nowhere', () => {
    const nowhere = layoutMap(journeyChapters(journeyFixture('completed'), null), 460, 'overview')
    expect(overviewWindow(nowhere, 400)).toMatchObject({ top: 0, fadeTop: false, fadeBottom: true })
  })

  it('shows the whole drawing, unfaded, in a window taller than it', () => {
    expect(overviewWindow(scene, scene.height + 100)).toEqual({
      top: 0,
      height: scene.height,
      fadeTop: false,
      fadeBottom: false,
    })
  })
})

describe('overviewDescription', () => {
  it('says where the player stands, in which stage, and what comes next', () => {
    expect(overviewDescription(journeyChapters(journeyFixture(), FIRST_MISSION))).toBe(
      'You are at 4.1 The Link That Never Went Down, in stage 4, Recover from failure. Open the map.'
    )
    expect(overviewDescription(journeyChapters(longerJourneyFixture(false), FIRST_MISSION))).toBe(
      'You are at 4.1 The Link That Never Went Down, in stage 4, Recover from failure; next: 4.2 A Restart Nobody Noticed. Open the map.'
    )
    expect(overviewDescription(journeyChapters(longerJourneyFixture(true), SECOND_MISSION))).toBe(
      'You are at 4.2 A Restart Nobody Noticed, in stage 4, Recover from failure. Open the map.'
    )
  })

  it('says so when everything written is completed, and when nothing is written', () => {
    expect(overviewDescription(journeyChapters(journeyFixture('completed'), null))).toBe(
      'Every mission written so far is completed. Open the map to replay one.'
    )
    expect(overviewDescription([])).toContain('no mission is written yet')
  })
})
