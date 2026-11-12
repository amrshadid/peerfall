import { FIRST_MISSION, journeyFixture, longerJourneyFixture, SECOND_MISSION } from '@features/map/utils/fixtures'
import { journeyChapters, PLANNED_PROGRESS } from '@features/map/utils/journey'
import { describe, expect, it } from 'vitest'
import { EDGE, PAD } from './map-layout.constants'
import { layoutMap } from './map-layout.util'
import { END_WORDS } from './map-text.constants'

const WIDTH = 774
const today = () => journeyChapters(journeyFixture(), FIRST_MISSION)

describe('layoutMap', () => {
  it('stacks the eleven stages from the top down without gaps, the network they end at under the last', () => {
    const scene = layoutMap(today(), WIDTH)
    expect(scene.chapters).toHaveLength(11)
    expect(scene.chapters[0]?.top).toBe(0)
    scene.chapters.forEach((chapter, index) => {
      expect(chapter.bottom).toBeGreaterThan(chapter.top)
      if (index > 0) {
        expect(chapter.top).toBe(scene.chapters[index - 1]?.bottom)
      }
    })
    expect(scene.terminus?.top).toBe(scene.chapters[10]?.bottom)
    expect(scene.height).toBeGreaterThan(scene.terminus?.bottom ?? Number.POSITIVE_INFINITY)
  })

  it('prints each stage header: its number, name, progress and what it covers', () => {
    const chapter = layoutMap(today(), WIDTH).chapters[3]
    const words = chapter?.texts.map((item) => item.text) ?? []
    expect(words[0]).toBe('STAGE 4 OF 11')
    expect(words).toContain('Recover from failure')
    expect(words).toContain('0 of 1 passed')
    expect(words.join(' ')).toContain('Measure an outage')
    expect(chapter?.name).toBe('Stage 4: Recover from failure')
    expect(chapter?.stretch).toBeNull()
  })

  it('draws a stage with no missions as a pencilled stretch that says so in words', () => {
    const scene = layoutMap(today(), WIDTH)
    const planned = scene.chapters.filter((chapter) => chapter.stretch !== null)
    expect(planned.map((chapter) => chapter.stage)).toEqual([1, 2, 3, 5, 6, 7, 8, 9, 10, 11])
    for (const chapter of planned) {
      expect(chapter.tone).toBe('planned')
      expect(chapter.stretch?.texts.map((item) => item.text)).toEqual([PLANNED_PROGRESS])
      expect(chapter.stretch?.texts.every((item) => item.dim)).toBe(true)
      expect(chapter.stretch?.y).toBeGreaterThan(chapter.panel.y + chapter.panel.height)
      expect(chapter.texts.some((item) => item.text === 'planned' && item.style === 'tone-planned')).toBe(true)
    }
  })

  it('walks every stop in play order, inside its own stage', () => {
    const chapters = journeyChapters(longerJourneyFixture(true), SECOND_MISSION)
    const scene = layoutMap(chapters, WIDTH)
    expect(scene.stops.map((stop) => stop.stop.number)).toEqual(['4.1', '4.2'])
    const stage = scene.chapters[3]
    for (const stop of scene.stops) {
      expect(stop.chapterId).toBe('recover-from-failure')
      expect(stop.y).toBeGreaterThan(stage?.top ?? 0)
      expect(stop.y).toBeLessThan(stage?.bottom ?? 0)
      expect(stop.texts[0]?.text).toBe(stop.stop.number)
    }
  })

  it('switches back at each stage: the next row runs the other way', () => {
    // Stage 4 is the fourth row, so it runs right to left.
    const [first, second] = layoutMap(journeyChapters(longerJourneyFixture(true), SECOND_MISSION), WIDTH).stops
    expect(first?.x).toBeGreaterThan(second?.x ?? 0)
  })

  it('splits a stage into balanced rows when it is too long for the width', () => {
    const source = journeyFixture()
    const many = source.map((entry) =>
      entry.chapter.stage === 4
        ? {
            ...entry,
            missions: Array.from({ length: 9 }, (_, index) => ({
              mission: { ...FIRST_MISSION, id: `mission-${index}`, title: `Mission ${index}` },
              status: 'available' as const,
              attempts: 0,
              hintsUsed: 0,
            })),
          }
        : entry
    )
    const scene = layoutMap(journeyChapters(many, null), 500)
    expect(new Set(scene.stops.map((stop) => stop.y)).size).toBe(3)
  })

  it('starts the road at one router and ends it on the backbone of the operated network', () => {
    const scene = layoutMap(today(), WIDTH)
    const origin = scene.origin
    const terminus = scene.terminus
    if (!origin || !terminus) {
      throw new Error('the drawing has no ends')
    }
    expect(origin.box.x).toBe(PAD)
    expect(origin.texts.map((item) => item.text)).toContain(END_WORDS.originName)
    expect(terminus.texts.map((item) => item.text)).toContain(END_WORDS.terminusName)
    expect(terminus.boxes).toHaveLength(5)
    const road = `${scene.road.reached} ${scene.road.ahead}`
    expect(road).toContain(`M${PAD} ${origin.box.y + origin.box.height / 2} L${EDGE} `)
    expect(scene.road.ahead.endsWith(` ${terminus.busY}`)).toBe(true)
  })

  it('inks the road into the farthest stop in reach, and never through a planned stage', () => {
    const scene = layoutMap(today(), WIDTH)
    const stop = scene.stops[0]
    expect(scene.road.reached.endsWith(`L${stop?.x} ${stop?.y}`)).toBe(true)
    for (const chapter of scene.chapters) {
      if (chapter.stretch) {
        expect(scene.road.reached).not.toContain(`L${chapter.stretch.x} ${chapter.stretch.y}`)
        expect(scene.road.ahead).toContain(`L${chapter.stretch.x} ${chapter.stretch.y}`)
      }
    }
    const locked = layoutMap(journeyChapters(journeyFixture('locked'), null), WIDTH)
    expect(locked.road.reached).toBe('')
  })

  it('stands "you" on the mission Continue goes to, and nowhere without one', () => {
    const scene = layoutMap(today(), WIDTH)
    expect(scene.here).toEqual({ key: FIRST_MISSION.id, x: scene.stops[0]?.x, y: scene.stops[0]?.y })
    expect(layoutMap(journeyChapters(journeyFixture('completed'), null), WIDTH).here).toBeNull()
  })

  it('cuts the overview headers to name and progress, the same stops and ends', () => {
    const chapters = today()
    const map = layoutMap(chapters, 460)
    const overview = layoutMap(chapters, 460, 'overview')
    expect(overview.height).toBeLessThan(map.height)
    expect(overview.here?.key).toBe(map.here?.key)
    expect(overview.chapters).toHaveLength(11)
    expect(overview.chapters[3]?.texts.map((item) => item.text)).toEqual([
      'STAGE 4 OF 11',
      'Recover from failure',
      '0 of 1 passed',
    ])
  })

  it('lays nothing out before the content is loaded', () => {
    const scene = layoutMap([], WIDTH)
    expect(scene).toMatchObject({ chapters: [], stops: [], origin: null, terminus: null, here: null })
  })
})
