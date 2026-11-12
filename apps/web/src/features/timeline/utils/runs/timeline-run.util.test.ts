import type { TimelineRun } from '@features/timeline/types'
import { describe, expect, it } from 'vitest'
import {
  BASELINE_EVENTS,
  HEALTHY_EVENTS,
  ONGOING_EVENTS,
  REPAIRED_EVENTS,
} from '@/test/fixtures/machine-events.fixture'
import {
  axisPercent,
  comparisonSentence,
  formatAxisSeconds,
  formatSeconds,
  outageSentence,
  timelineAxisOf,
  timelineRunOf,
} from './timeline-run.util'

const run = (label: string, outageSeconds: number | null): TimelineRun => ({ label, marks: [], outageSeconds })

describe('timelineRunOf', () => {
  it('has no run to show before a fault', () => {
    expect(timelineRunOf('Baseline', HEALTHY_EVENTS)).toBeNull()
    expect(timelineRunOf('Baseline', [])).toBeNull()
  })

  it('reads a baseline: nothing notices until the OSPF dead timer, then the route and the probe follow', () => {
    const baseline = timelineRunOf('Baseline', BASELINE_EVENTS)
    expect(baseline?.marks.map((mark) => [mark.kind, mark.atSeconds, mark.label])).toEqual([
      ['fault', 0, 'The link starts dropping every packet'],
      ['detection', 37.6, 'OSPF dead timer expired'],
      ['adjacency', 37.6, 'OSPF adjacency Full → Deleted'],
      ['route', 37.72, 'New route installed'],
      ['probe', 37.801, 'First probe answered again'],
    ])
    expect(baseline?.outageSeconds).toBe(37.801)
  })

  it('reads a repaired run: BFD notices first', () => {
    const repaired = timelineRunOf('Repaired', REPAIRED_EVENTS)
    const detection = repaired?.marks.find((mark) => mark.kind === 'detection')
    expect(detection).toMatchObject({
      atSeconds: 0.81,
      label: 'BFD session down',
      detail: 'a: peer 10.0.2.2 on a-c, control-expired',
    })
    expect(repaired?.outageSeconds).toBe(0.901)
  })

  it("says where each thing happened in FRR's own terms", () => {
    const details = timelineRunOf('Baseline', BASELINE_EVENTS)?.marks.map((mark) => mark.detail)
    expect(details).toEqual([
      'link a–c; its interfaces stay up',
      'a: neighbor 10.255.0.3 on a-c',
      'a: neighbor 10.255.0.3 on a-c (InactivityTimer)',
      'a: 10.255.0.3 via 10.0.1.2 on a-b',
      'a-to-c #380, 0.7 ms',
    ])
  })

  it("orders moments by the Machine's clock, not by the order they reached the game in", () => {
    // The fixture lists the probe's reply before the log lines that were written earlier.
    const repaired = timelineRunOf('Repaired', REPAIRED_EVENTS)
    expect(repaired?.marks.map((mark) => mark.kind)).toEqual(['fault', 'detection', 'adjacency', 'route', 'probe'])
    expect(repaired?.marks.map((mark) => mark.atSeconds)).toEqual([0, 0.81, 0.812, 0.88, 0.901])
  })

  it('never counts a reply from before the loss as the recovery', () => {
    // The probes answered before the fault, and no reply since: the outage is still open.
    const ongoing = timelineRunOf('Baseline', ONGOING_EVENTS)
    expect(ongoing?.marks.map((mark) => mark.kind)).toEqual(['fault'])
    expect(ongoing?.outageSeconds).toBeNull()
  })
})

describe('formatSeconds', () => {
  it('prints seconds with a unit, two decimals under ten seconds and one above', () => {
    expect(formatSeconds(0)).toBe('0.00 s')
    expect(formatSeconds(0.901)).toBe('0.90 s')
    expect(formatSeconds(2)).toBe('2.00 s')
    expect(formatSeconds(37.801)).toBe('37.8 s')
  })

  it('prints axis labels without trailing zeros', () => {
    expect([0, 0.5, 1, 10].map(formatAxisSeconds)).toEqual(['0', '0.5', '1', '10'])
  })
})

describe('timelineAxisOf', () => {
  it('puts both runs on one axis, ending on a round number past the last mark', () => {
    const baseline = timelineRunOf('Baseline', BASELINE_EVENTS)
    const repaired = timelineRunOf('Repaired', REPAIRED_EVENTS)
    expect(timelineAxisOf([baseline, repaired])).toEqual({ endSeconds: 40, ticks: [0, 10, 20, 30, 40] })
  })

  it('counts in fractions of a second for a short run, and reaches the target', () => {
    const repaired = timelineRunOf('Repaired', REPAIRED_EVENTS)
    expect(timelineAxisOf([repaired])).toEqual({ endSeconds: 1, ticks: [0, 0.2, 0.4, 0.6, 0.8, 1] })
    expect(timelineAxisOf([repaired], 2)).toEqual({ endSeconds: 2, ticks: [0, 0.5, 1, 1.5, 2] })
  })

  it('still has a scale with nothing recorded', () => {
    expect(timelineAxisOf([null, null])).toEqual({ endSeconds: 1, ticks: [0, 0.2, 0.4, 0.6, 0.8, 1] })
  })

  it('places a time in percent of the axis, and keeps it on the axis', () => {
    const axis = { endSeconds: 40, ticks: [] }
    expect(axisPercent(0, axis)).toBe(0)
    expect(axisPercent(10, axis)).toBe(25)
    expect(axisPercent(99, axis)).toBe(100)
    expect(axisPercent(-1, axis)).toBe(0)
  })
})

describe('the outage in words', () => {
  it('states how long traffic was lost, in seconds', () => {
    expect(outageSentence(run('Baseline', 37.801))).toBe('Baseline: traffic was lost for 37.8 s.')
  })

  it('says whether that is inside the target', () => {
    expect(outageSentence(run('Repaired', 0.901), 2)).toBe(
      'Repaired: traffic was lost for 0.90 s, inside the 2.00 s target.'
    )
    expect(outageSentence(run('Baseline', 37.801), 2)).toBe(
      'Baseline: traffic was lost for 37.8 s, over the 2.00 s target.'
    )
  })

  it('says so while traffic is still lost', () => {
    expect(outageSentence(run('Baseline', null), 2)).toBe('Baseline: traffic is still being lost.')
  })

  it('compares the two runs once both have recovered', () => {
    expect(comparisonSentence(run('Baseline', 37.801), run('Repaired', 0.901))).toBe(
      'Repaired recovered 36.9 s sooner than baseline.'
    )
    expect(comparisonSentence(run('Baseline', 1), run('Repaired', 1.5))).toBe(
      'Repaired recovered 0.50 s later than baseline.'
    )
    expect(comparisonSentence(run('Baseline', 1), run('Repaired', 1))).toBe(
      'Repaired recovered no sooner than baseline.'
    )
    expect(comparisonSentence(run('Baseline', null), run('Repaired', 1))).toBeNull()
    expect(comparisonSentence(null, run('Repaired', 1))).toBeNull()
  })
})
