import {
  FIRST_MISSION,
  JOURNEY_SKILLS,
  journeyFixture,
  longerJourneyFixture,
  SECOND_MISSION,
} from '@features/map/utils/fixtures'
import { describe, expect, it } from 'vitest'
import { PLANNED_PROGRESS } from './journey.constants'
import {
  currentChapter,
  journeyChapters,
  journeyMarks,
  journeyStops,
  journeySummary,
  markStateOf,
  toneOf,
} from './journey.util'

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
    expect(stop('completed')).toMatchObject({ state: 'clean', status: 'done, first try', playable: true })
  })

  it('tells a mission done with hints, or after more than one judged run, from one done first try', () => {
    expect(markStateOf('completed', 1, 0)).toBe('clean')
    expect(markStateOf('completed', 3, 0)).toBe('done')
    expect(markStateOf('completed', 1, 2)).toBe('helped')
    expect(markStateOf('in_progress', 3, 2)).toBe('progress')
  })

  it('gives a stage with no missions one planned stop that keeps its place on the road', () => {
    const chapters = journeyChapters(journeyFixture(), FIRST_MISSION)
    expect(chapters[0]?.marks).toEqual([
      expect.objectContaining({
        key: 'planned:first-router',
        planned: true,
        number: '1',
        state: 'locked',
        status: 'not built yet',
        playable: false,
        here: false,
      }),
    ])
    expect(chapters[3]?.marks).toBe(chapters[3]?.stops)
    expect(journeyMarks(chapters).map((stop) => stop.number)).toEqual([
      '1',
      '2',
      '3',
      '4.1',
      '5',
      '6',
      '7',
      '8',
      '9',
      '10',
      '11',
    ])
    expect(journeyStops(chapters).map((stop) => stop.number)).toEqual(['4.1'])
  })

  it('lists the FRR parts of each stage, as the README does', () => {
    const chapters = journeyChapters(journeyFixture(), FIRST_MISSION)
    expect(chapters.every((chapter) => chapter.parts.length > 0)).toBe(true)
    expect(chapters[1]?.parts).toEqual(['zebra', 'staticd'])
    expect(chapters[5]?.parts).toEqual(['bgpd'])
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

  it('names the skills a mission needs, whether a completed mission has earned each, and which one earns it', () => {
    const locked = journeyStops(journeyChapters(longerJourneyFixture(false), FIRST_MISSION, JOURNEY_SKILLS))[1]
    expect(locked?.needs).toEqual([
      {
        id: 'bfd-fast-detection',
        title: 'Make OSPF notice a dead link in under a second with BFD',
        met: false,
        earnedIn: 'The Link That Never Went Down',
      },
    ])
    const open = journeyStops(journeyChapters(longerJourneyFixture(true), SECOND_MISSION))[1]
    expect(open?.needs[0]?.met).toBe(true)
  })

  it('carries the skills a mission earns, its time and its Codex cards', () => {
    const [first, second] = journeyStops(journeyChapters(longerJourneyFixture(true), SECOND_MISSION, JOURNEY_SKILLS))
    expect(first).toMatchObject({
      skills: JOURNEY_SKILLS,
      minutes: 25,
      codex: [{ id: 'bfd', term: 'BFD' }],
      regionId: 'notice-it-fast',
    })
    // A skill the tree doesn't list is named by its id; a mission that gives no time has none.
    expect(second).toMatchObject({ skills: [{ id: 'graceful-restart', title: 'graceful-restart' }], minutes: null })
  })

  it("groups a stage's missions in its regions, each with its own progress", () => {
    const chapter = journeyChapters(longerJourneyFixture(true), SECOND_MISSION)[3]
    expect(chapter?.regions).toEqual([
      expect.objectContaining({
        key: 'recover-from-failure/notice-it-fast',
        name: 'Notice it fast',
        guide: 'bfdd, zebra',
        done: 1,
        tone: 'progress',
        progress: 'in progress · 1 of 2',
      }),
    ])
    expect(chapter?.regions[0]?.stops).toEqual(chapter?.stops)
    expect(journeyChapters(journeyFixture('completed'), null)[3]?.regions[0]?.progress).toBe('passed · 1 of 1')
    expect(journeyChapters(journeyFixture('locked'), null)[3]?.regions[0]?.progress).toBe('ahead · 0 of 1')
    expect(journeyChapters(journeyFixture(), null)[0]?.regions).toEqual([])
  })

  it("names a stop by the first skill its mission earns in the Skills view, else by the mission's title", () => {
    const skills = journeyStops(journeyChapters(longerJourneyFixture(true), SECOND_MISSION, JOURNEY_SKILLS, 'skills'))
    expect(skills.map((stop) => stop.title)).toEqual(['Measure an outage and tell what noticed it', 'graceful-restart'])
    const missions = journeyStops(journeyChapters(longerJourneyFixture(true), SECOND_MISSION, JOURNEY_SKILLS))
    expect(missions.map((stop) => stop.title)).toEqual([FIRST_MISSION.title, SECOND_MISSION.title])
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
