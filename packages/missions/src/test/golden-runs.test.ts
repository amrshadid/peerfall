import { judgeMission, summariseRun } from '@peerfall/game/utils'
import { describe, expect, it } from 'vitest'
import { recordedRuns } from '#test/recorded-runs'
import { appContent } from '#utils/loader/app-content.util'

// The release gate: runs recorded on the real Machine by `pnpm vm:golden`, judged again here by
// the mission's own checks. A change to a check or to the mission that flips a verdict fails here.
const MISSION = 'the-link-that-never-went-down'

function mission() {
  const loaded = appContent()
  const found = loaded.ok ? loaded.value.game.mission(MISSION) : undefined
  if (!found) {
    throw new Error(`no mission ${MISSION}`)
  }
  return found
}

const runs = recordedRuns(MISSION)
const run = (id: string) => {
  const found = runs.find((recorded) => recorded.run === id)
  if (!found) {
    throw new Error(`no recorded run ${id}: run pnpm vm:golden`)
  }
  return found
}
const objectives = (id: string) =>
  Object.fromEntries(
    judgeMission(mission(), run(id).events).objectives.map(({ objectiveId, result }) => [objectiveId, result.passed])
  )

describe('The Link That Never Went Down, on the Machine', () => {
  it('has all four golden runs, recorded for this version of the mission', () => {
    expect(runs.map((recorded) => recorded.run).sort()).toEqual([
      'baseline',
      'bfd-both-ends',
      'bfd-both-ends-again',
      'bfd-one-end',
    ])
    for (const recorded of runs) {
      expect(recorded.version).toBe(mission().version)
    }
  })

  it('judges every run as its solution says', () => {
    for (const recorded of runs) {
      expect([recorded.run, judgeMission(mission(), recorded.events).passed]).toEqual([recorded.run, recorded.passes])
    }
  })

  it('baseline: traffic is lost until the OSPF dead timer expires, and the mission is not passed', () => {
    const summary = summariseRun(run('baseline').events, mission())
    expect(summary.detection?.event).toBe('ospf_dead_timer_expired')
    expect(summary.outage?.durationMs).toBeGreaterThan(25_000)
    expect(summary.outage?.durationMs).toBeLessThan(45_000)
    expect(objectives('baseline')).toEqual({
      'reaches-c': true,
      'direct-while-healthy': true,
      'recovers-through-b': false,
    })
  })

  it('BFD on one end only: nothing detects the fault sooner, and the mission is not passed', () => {
    const summary = summariseRun(run('bfd-one-end').events, mission())
    expect(summary.detection?.event).toBe('ospf_dead_timer_expired')
    expect(summary.outage?.durationMs).toBeGreaterThan(25_000)
    expect(objectives('bfd-one-end')['recovers-through-b']).toBe(false)
  })

  it('BFD on both ends: the direct path before the fault, the path through b within the target after', () => {
    for (const id of ['bfd-both-ends', 'bfd-both-ends-again']) {
      const summary = summariseRun(run(id).events, mission())
      expect(summary.pathBefore?.interface).toBe('a-c')
      expect(summary.detection?.event).toBe('bfd_session_down')
      expect(summary.routeUpdate).not.toBeNull()
      expect(summary.outage?.durationMs).toBeLessThan(mission().recoveryTargetMs ?? 0)
      expect(objectives(id)).toEqual({ 'reaches-c': true, 'direct-while-healthy': true, 'recovers-through-b': true })
    }
  })

  it('a second run of the same script reaches the same verdict', () => {
    expect(objectives('bfd-both-ends-again')).toEqual(objectives('bfd-both-ends'))
  })
})
