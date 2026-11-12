import { describe, expect, it } from 'vitest'
import {
  baselineRun as baselineEvents,
  bfdBothEndsRun,
  EXAMPLE_MISSION,
  exampleContent,
  exampleMission,
  FOLLOW_UP_MISSION,
} from '#test/index'
import { MAX_SAVED_ATTEMPTS, type RunRole, type SavedRun } from '#types/definitions/runs'
import {
  baselineRun,
  continueMission,
  emptyProgress,
  findMissionProgress,
  latestAttempt,
  missionList,
  missionStatus,
  recordRun,
  repairedRun,
  revealNextHint,
  savedComparison,
  startMission,
} from '#utils/progress/progress.util'
import { summariseRun } from '#utils/runs/index'

const MISSION = EXAMPLE_MISSION
const ID = MISSION.id

const run = (role: RunRole, passed: boolean, savedAt: number, missionVersion = 1): SavedRun => ({
  role,
  missionVersion,
  savedAt,
  passed,
  summary: summariseRun(role === 'baseline' || !passed ? baselineEvents() : bfdBothEndsRun(), MISSION),
})

const started = () => startMission(emptyProgress(), ID, 100)

/** The progress after `runs`, which must all be recordable. */
function after(...runs: readonly SavedRun[]) {
  return runs.reduce((progress, saved) => recordRun(progress, ID, saved) ?? progress, started())
}

describe('starting a mission', () => {
  it('adds its record once and makes it where "Continue" goes', () => {
    const progress = startMission(startMission(started(), FOLLOW_UP_MISSION.id, 200), ID, 300)
    expect(progress.missions.map((record) => [record.missionId, record.firstStartedAt])).toEqual([
      [ID, 100],
      [FOLLOW_UP_MISSION.id, 200],
    ])
    expect(progress.lastActive).toBe(ID)
  })
})

describe('mission status', () => {
  it('goes from available to in progress to completed, and unlocks what needed it', () => {
    expect(missionStatus(emptyProgress(), MISSION)).toBe('available')
    expect(missionStatus(emptyProgress(), FOLLOW_UP_MISSION)).toBe('locked')
    expect(missionStatus(started(), MISSION)).toBe('in_progress')

    const completed = after(run('attempt', true, 500))
    expect(missionStatus(completed, MISSION)).toBe('completed')
    expect(missionStatus(completed, FOLLOW_UP_MISSION)).toBe('available')
  })

  it('lists every chapter, with attempts and hints used per mission', () => {
    const hinted = revealNextHint(after(run('attempt', false, 500)), MISSION, 'recovers-through-b') ?? started()
    const list = missionList(hinted, exampleContent())
    expect(list.map((entry) => [entry.chapter.id, entry.missions.length])).toEqual([
      ['recover-from-failure', 2],
      ['scale-with-bgp', 0],
    ])
    expect(list[0]?.missions).toMatchObject([
      { mission: MISSION, status: 'in_progress', attempts: 1, hintsUsed: 1 },
      { mission: FOLLOW_UP_MISSION, status: 'locked', attempts: 0, hintsUsed: 0 },
    ])
  })

  it('continues the mission last played, else the first one open', () => {
    const content = exampleContent()
    expect(continueMission(emptyProgress(), content)).toBe(MISSION)
    expect(continueMission(started(), content)).toBe(MISSION)
    const completed = after(run('attempt', true, 500))
    expect(continueMission(completed, content)).toBe(FOLLOW_UP_MISSION)
    const all = recordRun(
      startMission(completed, FOLLOW_UP_MISSION.id, 600),
      FOLLOW_UP_MISSION.id,
      run('attempt', true, 700)
    )
    expect(all && continueMission(all, content)).toBeNull()
  })
})

describe('revealing hints', () => {
  it('reveals one more hint of an objective each time, until none is left', () => {
    let progress = started()
    for (const expected of [1, 2, 3]) {
      progress = revealNextHint(progress, MISSION, 'recovers-through-b') ?? progress
      expect(findMissionProgress(progress, ID)?.hintsRevealed).toEqual({ 'recovers-through-b': expected })
    }
    expect(revealNextHint(progress, MISSION, 'recovers-through-b')).toBeNull()
  })

  it('reveals nothing for a mission not started or an objective it does not have', () => {
    expect(revealNextHint(emptyProgress(), MISSION, 'reaches-c')).toBeNull()
    expect(revealNextHint(started(), MISSION, 'nope')).toBeNull()
  })
})

describe('recording runs', () => {
  it('keeps a baseline without counting it as an attempt or completing anything', () => {
    const progress = after(run('baseline', false, 200))
    expect(findMissionProgress(progress, ID)).toMatchObject({ attempts: 0, completedAt: null })
    expect(baselineRun(progress, MISSION)?.savedAt).toBe(200)
    expect(progress.completionOrder).toEqual([])
  })

  it('counts each attempt and completes the mission the first time one passes', () => {
    const progress = after(run('attempt', false, 300), run('attempt', true, 400), run('attempt', true, 500))
    expect(findMissionProgress(progress, ID)).toMatchObject({ attempts: 3, completedAt: 400 })
    expect(progress.completionOrder).toEqual([ID])
  })

  it('never takes a completion back when a later attempt fails', () => {
    const progress = after(run('attempt', true, 400), run('attempt', false, 500))
    expect(missionStatus(progress, MISSION)).toBe('completed')
    expect(latestAttempt(progress, MISSION)?.passed).toBe(false)
    expect(repairedRun(progress, MISSION)?.savedAt).toBe(400)
  })

  it('replaces the baseline and keeps only the newest attempts', () => {
    const attempts = Array.from({ length: MAX_SAVED_ATTEMPTS + 2 }, (_, at) => run('attempt', false, 300 + at))
    const progress = after(run('baseline', false, 100), ...attempts, run('baseline', false, 900))
    const runs = findMissionProgress(progress, ID)?.runs ?? []
    expect(runs.map((saved) => [saved.role, saved.savedAt])).toEqual([
      ['baseline', 900],
      ...attempts.slice(-MAX_SAVED_ATTEMPTS).map((saved) => ['attempt', saved.savedAt]),
    ])
    expect(findMissionProgress(progress, ID)?.attempts).toBe(MAX_SAVED_ATTEMPTS + 2)
  })

  it('records nothing for a mission that was not started', () => {
    expect(recordRun(emptyProgress(), ID, run('attempt', true, 1))).toBeNull()
  })
})

describe('comparing saved runs', () => {
  it('sets the baseline beside the repaired run once there are both', () => {
    expect(savedComparison(after(run('baseline', false, 200)), MISSION)).toBeNull()
    const comparison = savedComparison(after(run('baseline', false, 200), run('attempt', true, 300)), MISSION)
    expect(comparison).toMatchObject({ outageSavedMs: 34_970 - 834, detectorChanged: true })
  })

  it('falls back to the latest attempt while none has passed', () => {
    const progress = after(run('attempt', false, 300), run('attempt', false, 400))
    expect(repairedRun(progress, MISSION)?.savedAt).toBe(400)
  })

  it("leaves out runs of another version of the mission: they aren't comparable", () => {
    const progress = after(run('baseline', false, 200), run('attempt', true, 300))
    const changed = exampleMission({ version: 2 })
    expect(baselineRun(progress, changed)).toBeNull()
    expect(latestAttempt(progress, changed)).toBeNull()
    expect(savedComparison(progress, changed)).toBeNull()
  })
})
