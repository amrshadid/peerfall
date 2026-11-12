import { describe, expect, it } from 'vitest'
import {
  BASELINE_OUTAGE_MS,
  BFD_ONE_END_OUTAGE_MS,
  BFD_OUTAGE_MS,
  BFD_RECOVERY_MS,
  baselineRun,
  bfdBothEndsRun,
  bfdNearEndFirstRun,
  bfdOneEndRun,
  EXAMPLE_MISSION,
  FAULT_AT_MS,
  healthyRun,
  stamped,
} from '#test/index'
import { CHECK_FAILURES } from '#types/definitions/checks'
import {
  checkDetectedBy,
  checkOutage,
  checkPath,
  checkReachable,
  checkRecovery,
  evaluateCheck,
  firstDetection,
  judgeMission,
  measureOutage,
  pathTaken,
  recoveryTimeMs,
  repliesBeforeFault,
} from '#utils/checks/index'

const MISSION = EXAMPLE_MISSION

const passedById = (events: ReturnType<typeof baselineRun>) =>
  Object.fromEntries(
    judgeMission(MISSION, events).objectives.map(({ objectiveId, result }) => [objectiveId, result.passed])
  )

describe('judgeMission: The Link That Never Went Down', () => {
  it('does not pass the baseline: traffic is lost until the OSPF dead timer expires', () => {
    const events = baselineRun()
    expect(judgeMission(MISSION, events).passed).toBe(false)
    expect(passedById(events)).toEqual({
      'reaches-c': true,
      'direct-while-healthy': true,
      'recovers-through-b': false,
    })
    expect(measureOutage(events, MISSION)?.durationMs).toBe(BASELINE_OUTAGE_MS)
    expect(firstDetection(events, MISSION)?.event).toBe('ospf_dead_timer_expired')
  })

  it('does not pass with BFD on one end only: the dead timer still decides', () => {
    const events = bfdOneEndRun()
    expect(judgeMission(MISSION, events).passed).toBe(false)
    expect(passedById(events)['recovers-through-b']).toBe(false)
    expect(measureOutage(events, MISSION)?.durationMs).toBe(BFD_ONE_END_OUTAGE_MS)
    expect(firstDetection(events, MISSION)?.event).toBe('ospf_dead_timer_expired')
  })

  it('passes with BFD on both ends: the direct link while healthy, back through b in under two seconds', () => {
    const verdict = judgeMission(MISSION, bfdBothEndsRun())
    expect(verdict.passed).toBe(true)
    expect(verdict.objectives.map(({ result }) => result.failure)).toEqual([null, null, null])
  })

  it.each([
    ['the fastest', 671],
    ['the slowest', 1157],
  ])('passes %s recovery measured on the Machine (%i ms outage)', (_, outageMs) => {
    const events = bfdBothEndsRun(outageMs - BFD_OUTAGE_MS)
    expect(measureOutage(events, MISSION)?.durationMs).toBe(outageMs)
    expect(judgeMission(MISSION, events).passed).toBe(true)
  })

  it('passes whichever end notices first', () => {
    expect(judgeMission(MISSION, bfdNearEndFirstRun()).passed).toBe(true)
  })

  it('reaches the same verdict however the events arrived, since it reads them by time', () => {
    const events = bfdBothEndsRun()
    const shuffled = [...events].reverse()
    expect(judgeMission(MISSION, shuffled)).toEqual(judgeMission(MISSION, events))
  })

  it('does not pass before the fault is injected, though the healthy checks already do', () => {
    const verdict = judgeMission(MISSION, healthyRun())
    expect(verdict.passed).toBe(false)
    expect(verdict.objectives.map(({ result }) => result.failure)).toEqual([null, null, CHECK_FAILURES.noFault])
  })

  it('never passes a mission with nothing to check', () => {
    expect(judgeMission({ ...MISSION, objectives: [] }, bfdBothEndsRun()).passed).toBe(false)
  })
})

describe('reachability', () => {
  it('counts the replies before the fault, and every reply while there is no fault', () => {
    // From 3 s before the fault to 38 ms before it, every 50 ms.
    expect(repliesBeforeFault(bfdBothEndsRun(), MISSION)).toBe(60)
    expect(repliesBeforeFault(healthyRun(), MISSION)).toBe(40)
  })

  it('fails when the probe got too few replies while healthy', () => {
    const silent = stamped([{ type: 'fault_injected', link: ['a', 'c'], atMs: 0 }])
    expect(checkReachable(silent, MISSION, { kind: 'reachable', minReplies: 1 })).toEqual({
      kind: 'reachable',
      passed: false,
      failure: CHECK_FAILURES.unreachable,
      replies: 0,
    })
  })

  it("ignores another probe's replies", () => {
    const other = stamped([{ type: 'probe_received', probe: 'b-to-c', sequence: 1, rttMs: 1, atMs: -100 }])
    expect(repliesBeforeFault(other, MISSION)).toBe(0)
  })
})

describe('path taken', () => {
  it("reads the route to the probe's destination on the probe's router, before the fault and after recovery", () => {
    const { before, after } = pathTaken(bfdBothEndsRun(), MISSION)
    expect(before).toMatchObject({ prefix: '10.255.0.3', interface: 'a-c', via: '10.0.2.2' })
    expect(after).toMatchObject({ prefix: '10.255.0.3', interface: 'a-b', via: '10.0.1.2' })
  })

  it('passes when both are the interfaces the check names', () => {
    expect(checkPath(bfdBothEndsRun(), MISSION, { kind: 'path', before: 'a-c', after: 'a-b' }).passed).toBe(true)
  })

  it('fails on the wrong interface', () => {
    const result = checkPath(bfdBothEndsRun(), MISSION, { kind: 'path', before: 'a-b' })
    expect(result).toMatchObject({ passed: false, failure: CHECK_FAILURES.wrongPath })
  })

  it('fails when no route to the destination was seen', () => {
    const noRoutes = bfdBothEndsRun().filter((event) => event.type !== 'fib_install')
    expect(checkPath(noRoutes, MISSION, { kind: 'path', before: 'a-c' }).failure).toBe(CHECK_FAILURES.noRoute)
  })

  it('cannot judge the path after recovery before the fault, or while traffic is still down', () => {
    expect(checkPath(healthyRun(), MISSION, { kind: 'path', after: 'a-b' }).failure).toBe(CHECK_FAILURES.noFault)
    const stillDown = baselineRun().filter((event) => event.timeMs < FAULT_AT_MS + 10_000)
    expect(checkPath(stillDown, MISSION, { kind: 'path', after: 'a-b' }).failure).toBe(CHECK_FAILURES.notRecovered)
  })

  it('does not count equal-cost paths as using one of them', () => {
    const shared = stamped([
      {
        type: 'fib_install',
        router: 'a',
        prefix: '10.255.0.3',
        via: '10.0.2.2',
        interface: 'a-c',
        nextHops: [
          { via: '10.0.2.2', interface: 'a-c' },
          { via: '10.0.1.2', interface: 'a-b' },
        ],
        protocol: 'ospf',
        atMs: -1000,
      },
    ])
    expect(checkPath(shared, MISSION, { kind: 'path', before: 'a-c' }).failure).toBe(CHECK_FAILURES.wrongPath)
  })
})

describe('recovery time', () => {
  it('measures from the fault to the first reply over the backup route', () => {
    expect(recoveryTimeMs(bfdBothEndsRun(), MISSION, 'a-b')).toBe(BFD_RECOVERY_MS)
    expect(recoveryTimeMs(bfdNearEndFirstRun(), MISSION, 'a-b')).toBe(651)
    expect(recoveryTimeMs(baselineRun(), MISSION, 'a-b')).toBe(34_940)
  })

  it("compares with the mission's target unless the check gives its own limit", () => {
    const events = bfdBothEndsRun()
    expect(checkRecovery(events, MISSION, { kind: 'recovery', via: 'a-b' })).toMatchObject({
      passed: true,
      limitMs: 2000,
      recovery: { afterFaultMs: BFD_RECOVERY_MS, route: { interface: 'a-b' } },
    })
    expect(checkRecovery(events, MISSION, { kind: 'recovery', via: 'a-b', withinMs: 500 })).toMatchObject({
      passed: false,
      failure: CHECK_FAILURES.tooSlow,
      limitMs: 500,
    })
  })

  it('is too slow at exactly the target: the target is "under"', () => {
    const events = bfdBothEndsRun()
    const result = checkRecovery(events, MISSION, { kind: 'recovery', via: 'a-b', withinMs: BFD_RECOVERY_MS })
    expect(result.failure).toBe(CHECK_FAILURES.tooSlow)
  })

  it('does not take a reply that was already on its way when the link broke for recovery', () => {
    const events = [
      ...baselineRun(),
      ...stamped([{ type: 'probe_received', probe: 'a-to-c', sequence: 999, rttMs: 12, atMs: 5 }]),
    ]
    expect(recoveryTimeMs(events, MISSION, 'a-b')).toBe(34_940)
  })

  it('counts a reply stamped a moment before the route it came back over', () => {
    const events = bfdBothEndsRun().map((event) =>
      event.type === 'fib_install' && event.router === 'a' && event.interface === 'a-b' && event.prefix === '10.255.0.3'
        ? { ...event, timeMs: FAULT_AT_MS + BFD_RECOVERY_MS + 3 }
        : event
    )
    expect(recoveryTimeMs(events, MISSION, 'a-b')).toBe(BFD_RECOVERY_MS)
  })

  it('has not recovered while replies have not come back through the backup', () => {
    const stillDown = baselineRun().filter((event) => event.timeMs < FAULT_AT_MS + 10_000)
    expect(checkRecovery(stillDown, MISSION, { kind: 'recovery', via: 'a-b' })).toMatchObject({
      passed: false,
      failure: CHECK_FAILURES.notRecovered,
      recovery: null,
    })
    expect(recoveryTimeMs(bfdBothEndsRun(), MISSION, 'a-c')).toBeNull()
  })
})

describe('outage', () => {
  it('is the longest gap between consecutive replies around the fault', () => {
    expect(measureOutage(bfdBothEndsRun(), MISSION)).toEqual({
      fromMs: FAULT_AT_MS - 38,
      toMs: FAULT_AT_MS + BFD_RECOVERY_MS,
      durationMs: BFD_OUTAGE_MS,
    })
    expect(measureOutage(bfdNearEndFirstRun(), MISSION)?.durationMs).toBe(831)
  })

  it('is open while packets are still going unanswered', () => {
    const stillDown = baselineRun().filter((event) => event.timeMs < FAULT_AT_MS + 10_000)
    expect(measureOutage(stillDown, MISSION)).toEqual({ fromMs: FAULT_AT_MS - 30, toMs: null, durationMs: null })
    expect(checkOutage(stillDown, MISSION, { kind: 'outage' }).failure).toBe(CHECK_FAILURES.notRecovered)
  })

  it('is nothing before the fault', () => {
    expect(measureOutage(healthyRun(), MISSION)).toBeNull()
    expect(checkOutage(healthyRun(), MISSION, { kind: 'outage' }).failure).toBe(CHECK_FAILURES.noFault)
  })

  it("compares with the mission's target unless the check gives its own limit", () => {
    expect(checkOutage(bfdBothEndsRun(), MISSION, { kind: 'outage' })).toMatchObject({ passed: true, limitMs: 2000 })
    expect(checkOutage(baselineRun(), MISSION, { kind: 'outage' })).toMatchObject({
      passed: false,
      failure: CHECK_FAILURES.tooSlow,
      outage: { durationMs: BASELINE_OUTAGE_MS },
    })
    expect(checkOutage(baselineRun(), MISSION, { kind: 'outage', maxMs: 40_000 }).passed).toBe(true)
  })

  it('stops measuring when the fault is cleared', () => {
    const cleared = [
      ...baselineRun().filter((event) => event.timeMs < FAULT_AT_MS + 10_000),
      ...stamped([
        { type: 'fault_cleared', link: ['a', 'c'], atMs: 10_000 },
        { type: 'probe_received', probe: 'a-to-c', sequence: 500, rttMs: 1, atMs: 10_040 },
      ]),
    ]
    expect(measureOutage(cleared, MISSION)?.toMs).toBeNull()
  })
})

describe('what detected the fault', () => {
  it('is the earliest BFD or dead-timer event on either end of the broken link', () => {
    expect(firstDetection(bfdBothEndsRun(), MISSION)).toEqual({
      event: 'bfd_session_down',
      router: 'c',
      interface: 'c-a',
      atMs: FAULT_AT_MS + 731,
      afterFaultMs: 731,
    })
    expect(firstDetection(bfdNearEndFirstRun(), MISSION)).toMatchObject({ router: 'a', afterFaultMs: 614 })
    expect(firstDetection(baselineRun(), MISSION)).toMatchObject({
      event: 'ospf_dead_timer_expired',
      router: 'c',
      afterFaultMs: 31_210,
    })
  })

  it('ignores sessions on links that did not break, and anything before the fault', () => {
    const events = stamped([
      {
        type: 'bfd_session_down',
        router: 'a',
        peer: '10.0.2.2',
        interface: 'a-c',
        reason: 'control-expired',
        atMs: -900,
      },
      { type: 'fault_injected', link: ['a', 'c'], atMs: 0 },
      {
        type: 'bfd_session_down',
        router: 'a',
        peer: '10.0.1.2',
        interface: 'a-b',
        reason: 'control-expired',
        atMs: 300,
      },
    ])
    expect(firstDetection(events, MISSION)).toBeNull()
    expect(checkDetectedBy(events, MISSION, { kind: 'detected-by', event: 'bfd_session_down' }).failure).toBe(
      CHECK_FAILURES.notDetected
    )
  })

  it('passes only for the detector the check names', () => {
    const check = { kind: 'detected-by', event: 'bfd_session_down' } as const
    expect(checkDetectedBy(bfdBothEndsRun(), MISSION, check).passed).toBe(true)
    expect(checkDetectedBy(baselineRun(), MISSION, check)).toMatchObject({
      passed: false,
      failure: CHECK_FAILURES.wrongDetector,
      detection: { event: 'ospf_dead_timer_expired' },
    })
    expect(checkDetectedBy(healthyRun(), MISSION, check).failure).toBe(CHECK_FAILURES.noFault)
  })
})

describe('evaluateCheck', () => {
  it('judges each declared kind', () => {
    const events = bfdBothEndsRun()
    const kinds = [
      { kind: 'reachable', minReplies: 1 },
      { kind: 'path', before: 'a-c' },
      { kind: 'recovery', via: 'a-b' },
      { kind: 'outage' },
      { kind: 'detected-by', event: 'bfd_session_down' },
    ] as const
    expect(kinds.map((check) => evaluateCheck(check, events, MISSION))).toEqual(
      kinds.map(({ kind }) => expect.objectContaining({ kind, passed: true, failure: null }))
    )
  })
})
