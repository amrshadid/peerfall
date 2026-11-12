import { FIRST_MISSION, journeyFixture, longerJourneyFixture, SECOND_MISSION } from '@features/map/utils/fixtures'
import { describe, expect, it } from 'vitest'
import { PLANNED_PROGRESS } from './journey.constants'
import { currentChapter, journeyChapters, journeyStops, journeySummary, toneOf } from './journey.util'

describe('journeyChapters', () => {
  it('keeps all eleven stages in play order, the ones with no missions as planned', () => {
    const chapters = journeyChapters(journeyFixture(), FIRST_MISSION)
    expect(chapters.map((chapter) => chapter.stage)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11])
    const planned = chapters.filter((chapter) => chapter.planned)
    expect(planned).toHaveLength(10)
    expect(planned.every((chapter) => chapter.tone === 'planned' && chapter.progress === PLANNED_PROGRESS)).toBe(true)
    expect(planned.every((chapter) => chapter.stops.length === 0 && !chapter.hasHere)).toBe(true)
    expect(chapters[0]).toMatchObject({ id: 'first-router', kicker: 'Stage 1 of 11', name: 'First router' })
    expect(chapters[0]?.summary).toContain('Planned: no missions yet.')
  })

  it('turns a mission into a stop, numbered by its stage and its place in it', () => {
    const chapter = journeyChapters(journeyFixture('available'), FIRST_MISSION)[3]
    expect(chapter).toMatchObject({ planned: false, total: 1, done: 0, tone: 'progress', progress: '0 of 1 passed' })
    expect(chapter?.stops[0]).toMatchObject({
      key: 'the-link-that-never-went-down',
      number: '4.1',
      title: 'The Link That Never Went Down',
      stage: 4,
      chapterId: 'recover-from-failure',
      state: 'available',
      playable: true,
      summary: FIRST_MISSION.objective,
      recoveryTargetMs: 2000,
    })
  })

  it('says each status in words and draws it in its own shape', () => {
    const stop = (status: Parameters<typeof journeyFixture>[0]) =>
      journeyChapters(journeyFixture(status), null)[3]?.stops[0]
    expect(stop('locked')).toMatchObject({ state: 'locked', status: 'locked', playable: false })
    expect(stop('available')).toMatchObject({ state: 'available', status: 'available', playable: true })
    expect(stop('in_progress')).toMatchObject({ state: 'progress', status: 'in progress', playable: true })
    expect(stop('completed')).toMatchObject({ state: 'done', status: 'completed', playable: true })
  })

  it('flags the mission Continue goes to, and only that one', () => {
    const chapters = journeyChapters(longerJourneyFixture(true), SECOND_MISSION)
    const stops = journeyStops(chapters)
    expect(stops.map((stop) => stop.here)).toEqual([false, true])
    expect(stops[1]?.status).toBe('available, you are here')
    expect(chapters.filter((chapter) => chapter.hasHere).map((chapter) => chapter.stage)).toEqual([4])
    expect(journeyStops(journeyChapters(journeyFixture('completed'), null)).some((stop) => stop.here)).toBe(false)
  })

  it('counts progress and carries attempts and hints', () => {
    const chapter = journeyChapters(longerJourneyFixture(true), SECOND_MISSION)[3]
    expect(chapter).toMatchObject({ done: 1, total: 2, progress: '1 of 2 passed', tone: 'progress' })
    expect(chapter?.stops[0]).toMatchObject({ attempts: 3, hintsUsed: 2 })
    expect(journeyChapters(journeyFixture('completed'), null)[3]).toMatchObject({
      tone: 'passed',
      progress: '1 of 1 passed',
    })
  })

  it('names what a mission needs first by title, and whether it is met', () => {
    const locked = journeyStops(journeyChapters(longerJourneyFixture(false), FIRST_MISSION))[1]
    expect(locked?.needs).toEqual([
      { id: 'the-link-that-never-went-down', title: 'The Link That Never Went Down', met: false },
    ])
    const open = journeyStops(journeyChapters(longerJourneyFixture(true), SECOND_MISSION))[1]
    expect(open?.needs[0]?.met).toBe(true)
  })

  it('is empty before the content is loaded', () => {
    expect(journeyChapters([], null)).toEqual([])
  })
})

describe('toneOf', () => {
  it('reads a stage from its stops', () => {
    expect(toneOf([])).toBe('planned')
    expect(toneOf([{ state: 'locked' }, { state: 'locked' }])).toBe('ahead')
    expect(toneOf([{ state: 'done' }, { state: 'locked' }])).toBe('progress')
    expect(toneOf([{ state: 'done' }, { state: 'done' }])).toBe('passed')
  })
})

describe('journeySummary', () => {
  it('reports the stage the player is in and how many are still planned', () => {
    const chapters = journeyChapters(journeyFixture(), FIRST_MISSION)
    expect(currentChapter(chapters)?.stage).toBe(4)
    expect(journeySummary(chapters)).toBe('Stage 4, Recover from failure: 0 of 1 mission passed · 10 stages planned')
    expect(journeySummary(journeyChapters(longerJourneyFixture(true), SECOND_MISSION))).toBe(
      'Stage 4, Recover from failure: 1 of 2 missions passed · 10 stages planned'
    )
    expect(journeySummary([])).toBe('The journey is not loaded yet')
  })
})
