import { FIRST_MISSION, journeyFixture, longerJourneyFixture, SECOND_MISSION } from '@features/map/utils/fixtures'
import { journeyChapters, journeyStops, plannedKeyOf, plannedStopOf } from '@features/map/utils/journey'
import { layoutMap } from '@features/map/utils/layout'
import { describe, expect, it } from 'vitest'
import { NOTE_STATES, PLANNED_NOTE } from './map-note.constants'
import { mapNotesOf, noteOf, sameTarget, stopStateOf, targetAt } from './map-note.util'

const chapters = journeyChapters(journeyFixture(), FIRST_MISSION)
const notes = mapNotesOf(chapters)

describe('mapNotesOf', () => {
  it('explains a mission by its objective, its state and its target', () => {
    expect(notes.stops.get(FIRST_MISSION.id)).toEqual({
      title: '4.1 · The Link That Never Went Down',
      text: FIRST_MISSION.objective,
      facts: ['Next up', 'Traffic back within 2 s', 'FRR parts: bfdd, graceful restart, fast reroute, vrrpd'],
    })
  })

  it('explains the planned stop of a stage with no missions by the stage itself', () => {
    expect(notes.stops.get(plannedKeyOf('exchange-routes'))).toEqual({
      title: 'Stage 6 · Exchange routes',
      text: `BGP sessions, best-path selection and route reflectors. ${PLANNED_NOTE}`,
      facts: ['Not built yet', 'FRR parts: bgpd'],
    })
  })

  it('says what every stage covers, and that a planned one has no missions yet', () => {
    expect(notes.chapters.size).toBe(11)
    expect(notes.chapters.get('recover-from-failure')).toEqual({
      title: 'What this stage covers · Recover from failure',
      text: 'Measure an outage and make the network notice it sooner.',
      facts: ['Stage 4 of 11', '0 of 1 passed', 'FRR parts: bfdd, graceful restart, fast reroute, vrrpd'],
    })
    const planned = notes.chapters.get('exchange-routes')
    expect(planned?.text.endsWith(PLANNED_NOTE)).toBe(true)
    expect(planned?.facts).toEqual(['Stage 6 of 11', 'Planned: no missions yet', 'FRR parts: bgpd'])
  })
})

describe('stopStateOf', () => {
  it('names what a locked mission waits for', () => {
    const [first, second] = journeyStops(journeyChapters(longerJourneyFixture(false), FIRST_MISSION))
    if (!first || !second) {
      throw new Error('the fixture has two missions')
    }
    expect(stopStateOf(first)).toBe(NOTE_STATES.progress)
    expect(stopStateOf(second)).toBe('Locked: finish The Link That Never Went Down first')
    const [done, open] = journeyStops(journeyChapters(longerJourneyFixture(true), null))
    // The fixture's first mission took hints.
    expect(done && stopStateOf(done)).toBe(NOTE_STATES.helped)
    expect(done && stopStateOf({ ...done, state: 'clean' })).toBe(NOTE_STATES.clean)
    expect(done && stopStateOf({ ...done, state: 'done' })).toBe(NOTE_STATES.done)
    expect(
      stopStateOf(plannedStopOf({ id: 'first-router', stage: 1, title: 'First router', summary: '', outcomes: [] }))
    ).toBe(NOTE_STATES.planned)
    expect(open && stopStateOf(open)).toBe(NOTE_STATES.available)
    expect(open && stopStateOf({ ...open, here: true })).toBe(NOTE_STATES.next)
    expect(stopStateOf({ ...second, needs: [] })).toBe(NOTE_STATES.lockedUnknown)
  })
})

describe('noteOf', () => {
  it('answers for the target, else for the stage in view', () => {
    expect(noteOf({ kind: 'stop', key: FIRST_MISSION.id }, notes, 'first-router')?.title).toMatch(/^4\.1 · /)
    expect(noteOf({ kind: 'chapter', id: 'label-and-steer' }, notes, null)?.title).toBe(
      'What this stage covers · Label and steer'
    )
    expect(noteOf(null, notes, 'first-router')?.title).toBe('What this stage covers · First router')
    expect(noteOf({ kind: 'stop', key: SECOND_MISSION.id }, notes, null)).toBeUndefined()
  })
})

describe('sameTarget', () => {
  it('compares by kind and name', () => {
    expect(sameTarget(null, null)).toBe(true)
    expect(sameTarget(null, { kind: 'stop', key: 'a' })).toBe(false)
    expect(sameTarget({ kind: 'stop', key: 'a' }, { kind: 'stop', key: 'a' })).toBe(true)
    expect(sameTarget({ kind: 'stop', key: 'a' }, { kind: 'chapter', id: 'a' })).toBe(false)
    expect(sameTarget({ kind: 'chapter', id: 'a' }, { kind: 'chapter', id: 'b' })).toBe(false)
  })
})

describe('targetAt', () => {
  it('finds the stage at a drawing height, and nothing under the last one', () => {
    const scene = layoutMap(chapters, 774)
    const fourth = scene.chapters[3]
    expect(targetAt(scene.chapters, (fourth?.top ?? 0) + 4)).toEqual({ kind: 'chapter', id: 'recover-from-failure' })
    expect(targetAt(scene.chapters, scene.height)).toBeNull()
  })
})
