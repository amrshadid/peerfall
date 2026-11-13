import { summariseRun } from '@peerfall/game/utils'
import { describe, expect, it } from 'vitest'
import { goldenMission, itJudgesEveryRun } from '#test/index'

// The release gate: runs recorded on the real Machine by `pnpm vm:golden`, judged again here by
// the mission's own checks. A change to a check or to the mission that flips a verdict fails here.
// Judged from its fault run, it is exempt from the start-run rule: reaching c before the fault is
// what the healthy network does.
const golden = goldenMission('the-link-that-never-went-down')
const { mission } = golden
const summary = (id: string) => summariseRun(golden.run(id).events, mission)
const HEALTHY = { 'reaches-c': true, 'direct-while-healthy': true }

describe('The Link That Never Went Down, on the Machine', () => {
  itJudgesEveryRun(golden, {
    baseline: { ...HEALTHY, 'recovers-through-b': false },
    'bfd-one-end': { ...HEALTHY, 'recovers-through-b': false },
    'bfd-both-ends': { ...HEALTHY, 'recovers-through-b': true },
    // The same script again: a second run reaches the same verdict.
    'bfd-both-ends-again': { ...HEALTHY, 'recovers-through-b': true },
  })

  it('baseline: traffic is lost until the OSPF dead timer expires', () => {
    expect(summary('baseline').detection?.event).toBe('ospf_dead_timer_expired')
    expect(summary('baseline').outage?.durationMs).toBeGreaterThan(25_000)
    expect(summary('baseline').outage?.durationMs).toBeLessThan(45_000)
  })

  it('BFD on one end only: nothing detects the fault sooner', () => {
    expect(summary('bfd-one-end').detection?.event).toBe('ospf_dead_timer_expired')
    expect(summary('bfd-one-end').outage?.durationMs).toBeGreaterThan(25_000)
  })

  it('BFD on both ends: the direct path before the fault, the path through b within the target after', () => {
    for (const id of ['bfd-both-ends', 'bfd-both-ends-again']) {
      expect(summary(id).pathBefore?.interface).toBe('a-c')
      expect(summary(id).detection?.event).toBe('bfd_session_down')
      expect(summary(id).routeUpdate).not.toBeNull()
      expect(summary(id).outage?.durationMs).toBeLessThan(mission.recoveryTargetMs ?? 0)
    }
  })
})
