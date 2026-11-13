import type { RunSummary } from '@peerfall/game/types'
import { describe, expect, it } from 'vitest'
import { BASELINE_EVENTS, HEALTHY_EVENTS, ONGOING_EVENTS } from '@/test/fixtures/machine-events.fixture'
import { attemptLabelOf, liveRunOf, timelineLanesOf, timelineRunOfSummary } from './saved-run.util'

const SETTING = { faultLink: ['a', 'c'], from: 'a', destination: '10.255.0.3' } as const

const HOP = {
  prefix: '10.255.0.3',
  interface: 'a-b',
  via: '10.0.1.2',
  nextHops: [{ via: '10.0.1.2', interface: 'a-b' }],
  protocol: 'ospf',
  atMs: 0,
}

/** The baseline's numbers are the game package's own golden run: the dead timer, then everything after it. */
const BASELINE: RunSummary = {
  faultAtMs: 1000,
  pathBefore: { ...HOP, interface: 'a-c', via: '10.0.2.2' },
  detection: { event: 'ospf_dead_timer_expired', router: 'c', interface: 'c-a', atMs: 32_210, afterFaultMs: 31_210 },
  adjacencyChange: {
    router: 'c',
    neighbor: '10.255.0.1',
    interface: 'c-a',
    from: 'Full',
    to: 'Deleted',
    reason: 'InactivityTimer',
    atMs: 32_214,
    afterFaultMs: 31_214,
  },
  routeUpdate: { route: HOP, atMs: 35_930, afterFaultMs: 34_930 },
  firstGoodProbe: { sequence: 760, atMs: 35_940, afterFaultMs: 34_940 },
  outage: { fromMs: 990, toMs: 35_940, durationMs: 34_950 },
  repliesBeforeFault: 60,
  probesLost: 699,
}

const REPAIRED: RunSummary = {
  ...BASELINE,
  detection: { event: 'bfd_session_down', router: 'c', interface: 'c-a', atMs: 1731, afterFaultMs: 731 },
  adjacencyChange: BASELINE.adjacencyChange && { ...BASELINE.adjacencyChange, atMs: 1738, afterFaultMs: 738 },
  routeUpdate: { route: HOP, atMs: 1765, afterFaultMs: 765 },
  firstGoodProbe: { sequence: 76, atMs: 1796, afterFaultMs: 796 },
}

describe('timelineRunOfSummary', () => {
  it('lays a saved baseline out as the fault, its detection, the adjacency, the route and the first good probe', () => {
    const run = timelineRunOfSummary('Baseline', BASELINE, SETTING)
    expect(run?.marks.map((mark) => [mark.kind, mark.atSeconds, mark.label])).toEqual([
      ['fault', 0, 'The link starts dropping every packet'],
      ['detection', 31.21, 'OSPF dead timer expired'],
      ['adjacency', 31.214, 'OSPF adjacency Full → Deleted'],
      ['route', 34.93, 'New route installed'],
      ['probe', 34.94, 'First probe answered again'],
    ])
    expect(run?.label).toBe('Baseline')
    expect(run?.outageSeconds).toBe(34.94)
  })

  it('says which event detected the fault and on which router', () => {
    const marks = timelineRunOfSummary('Repaired', REPAIRED, SETTING)?.marks ?? []
    expect(marks.find((mark) => mark.kind === 'detection')).toMatchObject({
      label: 'BFD session down',
      detail: 'noticed by c on c-a',
      atSeconds: 0.731,
    })
    expect(marks.find((mark) => mark.kind === 'fault')?.detail).toBe('link a–c; its interfaces stay up')
    expect(marks.find((mark) => mark.kind === 'adjacency')?.detail).toBe(
      'c: neighbor 10.255.0.1 on c-a (InactivityTimer)'
    )
    expect(marks.find((mark) => mark.kind === 'route')?.detail).toBe('a: 10.255.0.3 via 10.0.1.2 on a-b')
    expect(marks.find((mark) => mark.kind === 'probe')?.detail).toBe('reply #76')
  })

  it('leaves out what a run never reached, and keeps its outage open', () => {
    const stillDown: RunSummary = { ...BASELINE, routeUpdate: null, firstGoodProbe: null }
    const run = timelineRunOfSummary('Baseline', stillDown, SETTING)
    expect(run?.marks.map((mark) => mark.kind)).toEqual(['fault', 'detection', 'adjacency'])
    expect(run?.outageSeconds).toBeNull()
  })

  it('has no run to draw for a summary without a fault', () => {
    expect(timelineRunOfSummary('Baseline', { ...BASELINE, faultAtMs: null }, SETTING)).toBeNull()
  })
})

describe('liveRunOf', () => {
  it('is null while no link is broken in the events', () => {
    expect(liveRunOf('This run', HEALTHY_EVENTS, SETTING)).toBeNull()
    expect(liveRunOf('This run', [], SETTING)).toBeNull()
  })

  it('draws a run as far as it has got, its outage still open', () => {
    const run = liveRunOf('This run', ONGOING_EVENTS, SETTING)
    expect(run?.marks.map((mark) => mark.kind)).toEqual(['fault'])
    expect(run?.outageSeconds).toBeNull()
  })

  it('counts only the probe router’s route to the probe’s destination as the route update', () => {
    const run = liveRunOf('This run', BASELINE_EVENTS, SETTING)
    expect(run?.marks.find((mark) => mark.kind === 'route')?.detail).toContain('a: 10.255.0.3 via 10.0.1.2 on a-b')
    const elsewhere = liveRunOf('This run', BASELINE_EVENTS, { ...SETTING, from: 'b' })
    expect(elsewhere?.marks.some((mark) => mark.kind === 'route')).toBe(false)
  })
})

describe('attemptLabelOf', () => {
  it('calls a run repaired only when it met the objectives', () => {
    expect(attemptLabelOf(true)).toBe('Repaired')
    expect(attemptLabelOf(false)).toBe('Latest attempt')
  })
})

describe('timelineLanesOf', () => {
  const baseline = timelineRunOfSummary('Baseline', BASELINE, SETTING)
  const repaired = timelineRunOfSummary('Repaired', REPAIRED, SETTING)
  const live = liveRunOf('This run', ONGOING_EVENTS, SETTING)

  it('puts the saved runs side by side when nothing is running', () => {
    expect(timelineLanesOf(baseline, repaired, null)).toEqual({ baseline, repaired })
  })

  it('draws a first run where the baseline will be kept', () => {
    expect(timelineLanesOf(null, null, live)).toEqual({ baseline: live, repaired: null })
  })

  it('draws a later run beside the baseline, in place of the last attempt', () => {
    expect(timelineLanesOf(baseline, repaired, live)).toEqual({ baseline, repaired: live })
  })
})
