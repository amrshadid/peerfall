import type { MachineState } from '@peerfall/machine/types'
import { describe, expect, it } from 'vitest'
import { bfdBothEndsRun, EXAMPLE_MISSION, stateMission } from '#test/index'
import { CHECK_FAILURES, type CheckDefinition } from '#types/definitions/checks'
import { evaluateCheck, hasRunChecks, hasStateChecks, judgeMission, stateRequestOf } from '#utils/checks/index'

// Router a as the Machine showed it: FRR started by its init script, a static route through b.
const STATE: MachineState = {
  routers: {
    a: {
      daemons: ['mgmtd', 'zebra', 'staticd', 'watchfrr'],
      routes: [
        { prefix: '10.0.1.0/30', protocol: 'kernel', nextHops: [{ via: null, interface: 'a-b' }] },
        { prefix: '10.0.2.0/30', protocol: 'static', nextHops: [{ via: '10.0.1.2', interface: 'a-b' }] },
        { prefix: '192.0.2.0/24', protocol: 'static', nextHops: [] },
      ],
      runningConfig:
        'frr version 10.6.1\nfrr defaults traditional\nhostname a\n!\nip route 10.0.2.0/30 10.0.1.2\n!\ninterface a-b\n ip address 10.0.1.1/30\nexit\n!\ninterface lo\n description router a loopback\nexit\n!\n',
      savedConfig: 'frr defaults traditional\nhostname a\n!\ninterface a-b\n ip address 10.0.1.1/30\nexit\n!\n',
    },
    b: { daemons: [], runningConfig: null, savedConfig: null },
  },
  pings: [
    { from: 'a', to: '10.0.1.2', sent: 3, received: 3 },
    { from: 'a', to: '10.0.2.2', sent: 3, received: 0 },
  ],
}

const judge = (check: CheckDefinition, state: MachineState | null = STATE) => evaluateCheck(check, [], {}, state)

describe('daemons', () => {
  it('passes when every daemon named answered vtysh', () => {
    expect(judge({ kind: 'daemons', router: 'a', daemons: ['zebra', 'mgmtd', 'watchfrr'] })).toEqual({
      kind: 'daemons',
      passed: true,
      failure: null,
      router: 'a',
      running: ['mgmtd', 'zebra', 'staticd', 'watchfrr'],
      missing: [],
    })
  })

  it('names the ones that did not', () => {
    expect(judge({ kind: 'daemons', router: 'a', daemons: ['zebra', 'ospfd'] })).toMatchObject({
      passed: false,
      failure: CHECK_FAILURES.daemonsDown,
      missing: ['ospfd'],
    })
    expect(judge({ kind: 'daemons', router: 'b', daemons: ['zebra'] })).toMatchObject({
      failure: CHECK_FAILURES.daemonsDown,
      running: [],
      missing: ['zebra'],
    })
  })
})

describe('route', () => {
  it('finds the route for exactly a prefix, with what installed it and where it leaves', () => {
    expect(
      judge({ kind: 'route', router: 'a', prefix: '10.0.1.0/30', protocol: 'kernel', interface: 'a-b' })
    ).toMatchObject({ passed: true, route: { prefix: '10.0.1.0/30', protocol: 'kernel' } })
  })

  it('finds the route an address would use: the longest prefix that covers it', () => {
    expect(judge({ kind: 'route', router: 'a', to: '10.0.2.2', protocol: 'static', via: '10.0.1.2' })).toMatchObject({
      passed: true,
      route: { prefix: '10.0.2.0/30' },
    })
  })

  it('fails with no route when the kernel has none there', () => {
    expect(judge({ kind: 'route', router: 'a', to: '10.77.0.1' })).toMatchObject({
      passed: false,
      failure: CHECK_FAILURES.noRoute,
      route: null,
    })
    expect(judge({ kind: 'route', router: 'a', prefix: '10.0.2.0/24' }).failure).toBe(CHECK_FAILURES.noRoute)
  })

  it('fails with the wrong route when another protocol, next hop or interface has it', () => {
    const wrong = { passed: false, failure: CHECK_FAILURES.wrongRoute }
    expect(judge({ kind: 'route', router: 'a', to: '10.0.1.2', protocol: 'static' })).toMatchObject(wrong)
    expect(judge({ kind: 'route', router: 'a', to: '10.0.2.2', via: '10.0.1.9' })).toMatchObject(wrong)
    expect(judge({ kind: 'route', router: 'a', to: '10.0.2.2', interface: 'a-c' })).toMatchObject(wrong)
  })

  it('does not take a route that forwards nowhere for one through an interface', () => {
    expect(judge({ kind: 'route', router: 'a', to: '192.0.2.1', protocol: 'static' }).passed).toBe(true)
    expect(judge({ kind: 'route', router: 'a', to: '192.0.2.1', interface: 'a-b' }).failure).toBe(
      CHECK_FAILURES.wrongRoute
    )
  })
})

describe('reaches', () => {
  it('passes when enough of the packets were answered', () => {
    expect(judge({ kind: 'reaches', from: 'a', to: '10.0.1.2', minReplies: 2 })).toEqual({
      kind: 'reaches',
      passed: true,
      failure: null,
      from: 'a',
      to: '10.0.1.2',
      sent: 3,
      received: 3,
    })
  })

  it('fails when too few were', () => {
    expect(judge({ kind: 'reaches', from: 'a', to: '10.0.2.2', minReplies: 2 })).toMatchObject({
      passed: false,
      failure: CHECK_FAILURES.unreachable,
      received: 0,
    })
  })
})

describe('config', () => {
  it('finds a line in its block, in the running or the saved configuration', () => {
    const line = { kind: 'config', router: 'a', block: ['interface a-b'], line: 'ip address 10.0.1.1/30' } as const
    expect(judge({ ...line, source: 'running' })).toMatchObject({ passed: true, found: 'ip address 10.0.1.1/30' })
    expect(judge({ ...line, source: 'saved' }).passed).toBe(true)
  })

  it('takes the first words of a line for the line', () => {
    const check = { kind: 'config', router: 'a', source: 'running', block: ['interface lo'], line: 'description' }
    expect(judge(check as CheckDefinition)).toMatchObject({ passed: true, found: 'description router a loopback' })
  })

  it('fails when the line is in the other configuration only, or in another block', () => {
    const saved = { kind: 'config', router: 'a', source: 'saved' } as const
    expect(judge({ ...saved, block: [], line: 'ip route 10.0.2.0/30' })).toMatchObject({
      passed: false,
      failure: CHECK_FAILURES.notConfigured,
      found: null,
    })
    expect(judge({ ...saved, block: ['interface lo'], line: 'ip address 10.0.1.1/30' }).passed).toBe(false)
    expect(judge({ ...saved, source: 'running', block: [], line: 'ip address' }).passed).toBe(false)
  })

  it('fails on a router whose FRR is down: it runs no configuration', () => {
    expect(judge({ kind: 'config', router: 'b', source: 'running', block: [], line: 'hostname' })).toMatchObject({
      passed: false,
      failure: CHECK_FAILURES.notConfigured,
    })
  })
})

describe('before the state is read', () => {
  it('every state check is not checked yet', () => {
    const checks: CheckDefinition[] = [
      { kind: 'daemons', router: 'a', daemons: ['zebra'] },
      { kind: 'route', router: 'a', to: '10.0.2.2' },
      { kind: 'reaches', from: 'a', to: '10.0.1.2', minReplies: 2 },
      { kind: 'config', router: 'a', source: 'saved', block: [], line: 'hostname' },
    ]
    for (const check of checks) {
      expect(judge(check, null)).toMatchObject({ kind: check.kind, passed: false, failure: CHECK_FAILURES.notChecked })
    }
  })

  it('a part that was not read is not checked either', () => {
    const partial: MachineState = { routers: { a: { daemons: ['zebra'] } }, pings: [] }
    expect(judge({ kind: 'route', router: 'a', to: '10.0.2.2' }, partial).failure).toBe(CHECK_FAILURES.notChecked)
    expect(judge({ kind: 'reaches', from: 'a', to: '10.0.1.2', minReplies: 2 }, partial).failure).toBe(
      CHECK_FAILURES.notChecked
    )
  })
})

describe('what a mission needs read', () => {
  it('is each router’s parts and each ping once', () => {
    const mission = stateMission()
    expect(hasStateChecks(mission)).toBe(true)
    expect(hasRunChecks(mission)).toBe(false)
    expect(stateRequestOf(mission)).toEqual({
      routers: { a: ['daemons', 'routes', 'savedConfig'], c: ['routes'] },
      pings: [{ from: 'a', to: '10.0.2.2', count: 3 }],
    })
  })

  it('is nothing for a mission judged from a fault run only', () => {
    expect(stateRequestOf(EXAMPLE_MISSION)).toBeNull()
    expect(hasStateChecks(EXAMPLE_MISSION)).toBe(false)
    expect(hasRunChecks(EXAMPLE_MISSION)).toBe(true)
  })
})

describe('judgeMission with state', () => {
  const mission = stateMission()
  const passing: MachineState = {
    routers: {
      a: {
        daemons: ['mgmtd', 'zebra', 'staticd', 'watchfrr'],
        routes: [{ prefix: '10.0.2.0/30', protocol: 'static', nextHops: [{ via: '10.0.1.2', interface: 'a-b' }] }],
        savedConfig: 'hostname a\n!\nip route 10.0.2.0/30 10.0.1.2\n!\n',
      },
      c: { routes: [{ prefix: '10.0.1.0/30', protocol: 'static', nextHops: [{ via: '10.0.2.1', interface: 'c-b' }] }] },
    },
    pings: [{ from: 'a', to: '10.0.2.2', sent: 3, received: 3 }],
  }

  it('passes a mission with no fault and no probe from the state alone', () => {
    const verdict = judgeMission(mission, [], passing)
    expect(verdict.passed).toBe(true)
    expect(verdict.objectives.map(({ result }) => result.kind)).toEqual([
      'daemons',
      'route',
      'route',
      'reaches',
      'config',
    ])
  })

  it('does not pass it before the state is read, or when one objective is not met', () => {
    expect(judgeMission(mission, []).passed).toBe(false)
    const oneWay = { ...passing, routers: { ...passing.routers, c: { routes: [] } } }
    const verdict = judgeMission(mission, [], oneWay)
    expect(verdict.passed).toBe(false)
    expect(verdict.objectives.map(({ result }) => result.failure)).toEqual([
      null,
      null,
      CHECK_FAILURES.noRoute,
      null,
      null,
    ])
  })

  it('judges a fault mission exactly as before, with or without a state', () => {
    const events = bfdBothEndsRun()
    expect(judgeMission(EXAMPLE_MISSION, events, passing)).toEqual(judgeMission(EXAMPLE_MISSION, events))
  })
})
