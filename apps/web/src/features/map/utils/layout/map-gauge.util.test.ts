import type { StageSpan } from '@features/map/types'
import { FIRST_MISSION, journeyFixture } from '@features/map/utils/fixtures'
import { journeyChapters } from '@features/map/utils/journey'
import { describe, expect, it } from 'vitest'
import { gaugeAt, gaugeSegments, gaugeStagesOf, gaugeWindow, stageAt } from './map-gauge.util'

const stages: readonly StageSpan[] = [
  { id: 'first-router', top: 0, bottom: 500 },
  { id: 'follow-a-packet', top: 500, bottom: 520 },
  { id: 'build-an-underlay', top: 520, bottom: 1000 },
]

describe('gaugeSegments', () => {
  it('gives each stage its share of the drawing, never less than the minimum', () => {
    const segments = gaugeSegments(stages, 0.1)
    expect(segments.reduce((sum, segment) => sum + segment.size, 0)).toBeCloseTo(1)
    expect(segments[1]?.size).toBeCloseTo(0.1)
    expect(segments[0]?.start).toBe(0)
    expect(segments[2]?.start).toBeCloseTo((segments[0]?.size ?? 0) + (segments[1]?.size ?? 0))
  })
})

describe('gaugeAt', () => {
  it('maps drawing heights onto the gauge in order', () => {
    const segments = gaugeSegments(stages, 0.1)
    const marks = [0, 250, 510, 760, 1000].map((y) => gaugeAt(y, stages, segments))
    expect(marks[0]).toBe(0)
    expect(marks[4]).toBe(1)
    expect(marks.every((mark, index) => index === 0 || mark > (marks[index - 1] ?? 0))).toBe(true)
  })
})

describe('gaugeWindow', () => {
  const segments = gaugeSegments(stages, 0.1)

  it('maps the scrolled view onto the gauge, moving down as the drawing scrolls', () => {
    const atTop = gaugeWindow(0, 200, stages, segments)
    expect(atTop.start).toBe(0)
    expect(atTop.size).toBeCloseTo(gaugeAt(200, stages, segments))

    const lower = gaugeWindow(600, 200, stages, segments)
    expect(lower.start).toBeCloseTo(gaugeAt(600, stages, segments))
    expect(lower.start + lower.size).toBeCloseTo(gaugeAt(800, stages, segments))
  })

  it('agrees with the "You" marker: a view starting at a height starts at its mark', () => {
    const here = gaugeAt(510, stages, segments)
    expect(gaugeWindow(510, 100, stages, segments).start).toBeCloseTo(here)
  })

  it('never shrinks below the minimum and never runs past the foot', () => {
    expect(gaugeWindow(100, 0, stages, segments, 0.05).size).toBe(0.05)
    const bottom = gaugeWindow(1000, 0, stages, segments, 0.05)
    expect(bottom.start + bottom.size).toBeCloseTo(1)
    const pastFoot = gaugeWindow(900, 400, stages, segments)
    expect(pastFoot.start + pastFoot.size).toBeCloseTo(1)
  })
})

describe('gaugeStagesOf', () => {
  it('places each stage on its segment, counts its missions and says a planned one in words', () => {
    const chapters = journeyChapters(journeyFixture(), FIRST_MISSION)
    const segments = gaugeSegments(
      chapters.map((chapter, index) => ({ id: chapter.id, top: index, bottom: index + 1 }))
    )
    const marks = gaugeStagesOf(chapters, segments)
    expect(marks.map((mark) => mark.stage)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11])
    expect(marks[1]?.start).toBeCloseTo(segments[1]?.start ?? -1)
    expect(marks[0]).toMatchObject({ count: 'planned', label: 'Stage 1, First router, Planned: no missions yet' })
    expect(marks[3]).toMatchObject({ count: '0/1', label: 'Stage 4, Recover from failure, 0 of 1 passed' })
  })
})

describe('stageAt', () => {
  it('finds the stage at a height', () => {
    expect(stageAt(10, stages)).toBe('first-router')
    expect(stageAt(510, stages)).toBe('follow-a-packet')
    expect(stageAt(5000, stages)).toBe('build-an-underlay')
  })
})
