import { FIRST_MISSION, journeyFixture, longerJourneyFixture, SECOND_MISSION } from '@features/map/utils/fixtures'
import { journeyChapters, journeyStops } from '@features/map/utils/journey'
import { describe, expect, it } from 'vitest'
import { PLAN_NOTES } from './map-detail.constants'
import { formatTarget, lockNoteOf, mapDetailOf, playLabelOf } from './map-detail.util'

function detailOf(source: ReturnType<typeof journeyFixture>, next: { id: string } | null, at = 0) {
  const chapters = journeyChapters(source, next)
  const stop = journeyStops(chapters)[at]
  if (!stop) {
    throw new Error('the fixture has no such stop')
  }
  return mapDetailOf(stop, chapters)
}

describe('mapDetailOf', () => {
  it('says everything about an open mission and links to it', () => {
    expect(detailOf(journeyFixture('available'), FIRST_MISSION)).toEqual({
      place: 'Stage 4 · Recover from failure · 4.1',
      title: 'The Link That Never Went Down',
      state: 'available',
      status: 'Available, you are here',
      objective: FIRST_MISSION.objective,
      needs: [],
      attempts: 'None yet',
      hints: 'None',
      recovery: 'Traffic back within 2 s',
      play: { label: 'Play', href: '#/mission/the-link-that-never-went-down' },
      note: null,
    })
  })

  it('counts attempts and hints in words', () => {
    expect(detailOf(journeyFixture('in_progress', 1, 1), FIRST_MISSION)).toMatchObject({
      attempts: '1 judged run',
      hints: '1 hint',
      play: { label: 'Continue' },
    })
    expect(detailOf(longerJourneyFixture(true), SECOND_MISSION)).toMatchObject({
      status: 'Completed',
      attempts: '3 judged runs',
      hints: '2 hints',
      play: { label: 'Replay' },
    })
  })

  it('gives a locked mission no link, and names what to complete first', () => {
    const detail = detailOf(longerJourneyFixture(false), FIRST_MISSION, 1)
    expect(detail.play).toBeNull()
    expect(detail.status).toBe('Locked')
    expect(detail.note).toBe('Locked: complete The Link That Never Went Down first.')
    expect(detail.needs).toEqual([{ id: FIRST_MISSION.id, title: FIRST_MISSION.title, met: false }])
    expect(detail.recovery).toBe('Traffic back within 500 ms')
  })
})

describe('the small parts', () => {
  it('labels the action by the state', () => {
    expect(playLabelOf({ state: 'available' })).toBe('Play')
    expect(playLabelOf({ state: 'progress' })).toBe('Continue')
    expect(playLabelOf({ state: 'done' })).toBe('Replay')
  })

  it('explains a lock with no known cause in plain words', () => {
    expect(lockNoteOf({ playable: false, needs: [] })).toBe(PLAN_NOTES.locked)
    expect(lockNoteOf({ playable: true, needs: [] })).toBeNull()
  })

  it('formats a recovery target', () => {
    expect(formatTarget(2000)).toBe('2 s')
    expect(formatTarget(1500)).toBe('1.5 s')
    expect(formatTarget(300)).toBe('300 ms')
  })
})
