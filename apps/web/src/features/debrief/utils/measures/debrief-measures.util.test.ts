import type { RunSummary } from '@peerfall/game/types'
import { describe, expect, it } from 'vitest'
import { debriefMeasuresOf, debriefVerdictOf } from './debrief-measures.util'

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

describe('debriefVerdictOf', () => {
  it('rests a pass on the measured recovery', () => {
    expect(debriefVerdictOf(true, run('bfd_session_down', 796), TARGET_MS)).toEqual({
      passed: true,
      text: 'Passed: traffic was back in 0.80 s, inside the 2.00 s target.',
    })
    expect(debriefVerdictOf(true, null, TARGET_MS).text).toBe('Passed: traffic was back inside the 2.00 s target.')
  })

  it('says what is still asked for when the mission has not passed', () => {
    expect(debriefVerdictOf(false, null, TARGET_MS)).toEqual({
      passed: false,
      text: 'Not passed yet: traffic has to be back in under 2.00 s.',
    })
  })

  it('speaks of objectives, not of traffic, in a mission that times nothing', () => {
    expect(debriefVerdictOf(true, null, null).text).toBe('Passed: every objective is met.')
    expect(debriefMeasuresOf(null, null, null)).toEqual([])
    expect(debriefMeasuresOf(null, { ...run('bfd_session_down', null), faultAtMs: null }, null)).toEqual([])
  })
})
