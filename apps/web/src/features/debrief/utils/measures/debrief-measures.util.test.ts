import type { RunSummary } from '@peerfall/game/types'
import { describe, expect, it } from 'vitest'
import { debriefMeasuresOf, debriefResultOf } from './debrief-measures.util'

const TARGET_MS = 2000

const HOP = {
  prefix: '10.255.0.3',
  interface: 'a-b',
  via: '10.0.1.2',
  nextHops: [{ via: '10.0.1.2', interface: 'a-b' }],
  protocol: 'ospf',
  atMs: 0,
}

const run = (detectedBy: 'bfd_session_down' | 'ospf_dead_timer_expired', recoveredMs: number | null): RunSummary => ({
  faultAtMs: 1000,
  pathBefore: null,
  detection: { event: detectedBy, router: 'c', interface: 'c-a', atMs: 0, afterFaultMs: 731 },
  adjacencyChange: null,
  routeUpdate: recoveredMs === null ? null : { route: HOP, atMs: 0, afterFaultMs: recoveredMs - 10 },
  firstGoodProbe: recoveredMs === null ? null : { sequence: 9, atMs: 0, afterFaultMs: recoveredMs },
  outage: null,
  repliesBeforeFault: 60,
  probesLost: 12,
})

describe('debriefMeasuresOf', () => {
  it('sets the outage before the change beside the one after it, with what noticed each time', () => {
    const measures = debriefMeasuresOf(run('ospf_dead_timer_expired', 34_940), run('bfd_session_down', 796), TARGET_MS)
    expect(measures).toEqual([
      { label: 'Outage before your change', value: '34.9 s', tone: 'bad' },
      { label: 'What noticed it then', value: 'OSPF dead timer expired on c, 0.73 s after the fault' },
      { label: 'Outage after your change', value: '0.80 s', tone: 'good' },
      { label: 'What noticed it now', value: 'BFD session down on c, 0.73 s after the fault' },
      { label: 'Traffic came back through', value: 'a-b' },
      { label: 'Recovery target', value: 'under 2.00 s' },
    ])
  })

  it('says so when traffic never came back in a run', () => {
    expect(debriefMeasuresOf(run('ospf_dead_timer_expired', null), null, TARGET_MS)[0]).toEqual({
      label: 'Outage before your change',
      value: 'traffic did not come back',
      tone: 'bad',
    })
  })

  it('still gives the target when no run was kept', () => {
    expect(debriefMeasuresOf(null, null, TARGET_MS)).toEqual([{ label: 'Recovery target', value: 'under 2.00 s' }])
  })
})

describe('debriefResultOf', () => {
  it("writes the result as Kernelfall's card does, with the measured recovery in a timed mission", () => {
    expect(debriefResultOf(true, 3, run('bfd_session_down', 796), TARGET_MS)).toBe(
      'Mission complete · 3 of 3 objectives met · traffic back in 0.80 s, inside 2.00 s'
    )
    expect(debriefResultOf(true, 3, null, TARGET_MS)).toBe(
      'Mission complete · 3 of 3 objectives met · traffic back inside 2.00 s'
    )
  })

  it('says so when the mission has not passed', () => {
    expect(debriefResultOf(false, 3, null, TARGET_MS)).toBe('Not passed yet: an objective is still open.')
  })

  it('speaks of objectives, not of traffic, in a mission that times nothing', () => {
    expect(debriefResultOf(true, 2, null, null)).toBe('Mission complete · 2 of 2 objectives met')
    expect(debriefMeasuresOf(null, null, null)).toEqual([])
    expect(debriefMeasuresOf(null, { ...run('bfd_session_down', null), faultAtMs: null }, null)).toEqual([])
  })
})
