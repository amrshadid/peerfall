import { describe, expect, it } from 'vitest'
import {
  BASELINE_OUTAGE_MS,
  BFD_OUTAGE_MS,
  BFD_RECOVERY_MS,
  baselineRun,
  bfdBothEndsRun,
  bfdNearEndFirstRun,
  EXAMPLE_MISSION,
  FAULT_AT_MS,
  healthyRun,
} from '#test/index'
import { compareRuns, stepAfterFaultMs } from '#utils/runs/run-comparison.util'
import { summariseRun } from '#utils/runs/run-summary.util'

const MISSION = EXAMPLE_MISSION

describe('summariseRun', () => {
  it('reads the baseline: the dead timer, the adjacency, the route, then traffic', () => {
    expect(summariseRun(baselineRun(), MISSION)).toMatchObject({
      faultAtMs: FAULT_AT_MS,
      pathBefore: { interface: 'a-c', via: '10.0.2.2' },
      detection: { event: 'ospf_dead_timer_expired', router: 'c', afterFaultMs: 31_210 },
      adjacencyChange: { router: 'c', from: 'Full', to: 'Deleted', reason: 'InactivityTimer', afterFaultMs: 31_214 },
      routeUpdate: { route: { interface: 'a-b', via: '10.0.1.2' }, afterFaultMs: 34_930 },
      firstGoodProbe: { afterFaultMs: 34_940 },
      outage: { durationMs: BASELINE_OUTAGE_MS },
      repliesBeforeFault: 60,
      probesLost: 699,
    })
  })

  it('reads a BFD run where the far end noticed first and a rerouted before its own timer fired', () => {
    const summary = summariseRun(bfdBothEndsRun(), MISSION)
    expect(summary).toMatchObject({
      detection: { event: 'bfd_session_down', router: 'c', interface: 'c-a', afterFaultMs: 731 },
      adjacencyChange: { router: 'c', afterFaultMs: 738 },
      routeUpdate: { route: { interface: 'a-b' }, afterFaultMs: 765 },
      firstGoodProbe: { afterFaultMs: BFD_RECOVERY_MS },
      outage: { durationMs: BFD_OUTAGE_MS },
    })
    // a's own BFD expired 230 ms after its route had already moved.
    expect(summary.routeUpdate?.afterFaultMs).toBeLessThan(995)
  })

  it('reads a BFD run where the near end noticed first', () => {
    expect(summariseRun(bfdNearEndFirstRun(), MISSION)).toMatchObject({
      detection: { router: 'a', interface: 'a-c', afterFaultMs: 614 },
      adjacencyChange: { router: 'a', neighbor: '10.255.0.3', afterFaultMs: 627 },
      routeUpdate: { afterFaultMs: 648 },
      firstGoodProbe: { afterFaultMs: 651 },
      outage: { durationMs: 831 },
    })
  })

  it('knows only the healthy path and the replies before the fault', () => {
    expect(summariseRun(healthyRun(), MISSION)).toEqual({
      faultAtMs: null,
      pathBefore: expect.objectContaining({ interface: 'a-c' }),
      detection: null,
      adjacencyChange: null,
      routeUpdate: null,
      firstGoodProbe: null,
      outage: null,
      repliesBeforeFault: 40,
      probesLost: 0,
    })
  })

  it('shows a run that is still down as far as it has got', () => {
    const stillDown = baselineRun().filter((event) => event.timeMs < FAULT_AT_MS + 32_000)
    expect(summariseRun(stillDown, MISSION)).toMatchObject({
      detection: { afterFaultMs: 31_210 },
      routeUpdate: null,
      firstGoodProbe: null,
      outage: { toMs: null, durationMs: null },
    })
  })

  it('is plain data that survives being saved as JSON', () => {
    const summary = summariseRun(bfdBothEndsRun(), MISSION)
    expect(JSON.parse(JSON.stringify(summary))).toEqual(summary)
  })
})

describe('compareRuns', () => {
  const baseline = summariseRun(baselineRun(), MISSION)
  const repaired = summariseRun(bfdBothEndsRun(), MISSION)

  it('lines the two runs up step by step, each from its own fault', () => {
    expect(compareRuns(baseline, repaired).steps).toEqual([
      { step: 'detection', baselineMs: 31_210, repairedMs: 731, savedMs: 30_479 },
      { step: 'adjacency', baselineMs: 31_214, repairedMs: 738, savedMs: 30_476 },
      { step: 'route', baselineMs: 34_930, repairedMs: 765, savedMs: 34_165 },
      { step: 'probe', baselineMs: 34_940, repairedMs: BFD_RECOVERY_MS, savedMs: 34_144 },
    ])
  })

  it('says how much outage the repair saved and that something else detected the fault', () => {
    expect(compareRuns(baseline, repaired)).toMatchObject({
      outageSavedMs: BASELINE_OUTAGE_MS - BFD_OUTAGE_MS,
      detectorChanged: true,
    })
    expect(compareRuns(baseline, baseline)).toMatchObject({ outageSavedMs: 0, detectorChanged: false })
  })

  it('leaves out what a run never reached', () => {
    const unfinished = summariseRun(healthyRun(), MISSION)
    const comparison = compareRuns(baseline, unfinished)
    expect(comparison.outageSavedMs).toBeNull()
    expect(comparison.detectorChanged).toBe(false)
    expect(comparison.steps.every((step) => step.repairedMs === null && step.savedMs === null)).toBe(true)
    expect(stepAfterFaultMs(unfinished, 'probe')).toBeNull()
  })
})
