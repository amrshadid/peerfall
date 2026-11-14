import type { MachineState } from '@peerfall/machine/types'
import { describe, expect, it } from 'vitest'
import { bfdBothEndsRun, EXAMPLE_MISSION, LINK_STATE, stateMission } from '#test/index'
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

  // Two Ends of One Cable with the ends swapped: a holds 10.0.1.2 itself, as zebra showed it.
  const OWN = {
    prefix: '10.0.1.2/32',
    protocol: 'local',
    distance: 0,
    metric: 0,
    selected: true,
    installed: true,
    nextHops: [{ via: null, interface: 'a-b' }],
  }
  const swapped = (rib: (typeof OWN)[]): MachineState => ({
    routers: { a: { rib } },
    pings: [{ from: 'a', to: '10.0.1.2', sent: 3, received: 3 }],
  })

  it('fails when the address is the sending router’s own: it answered itself', () => {
    expect(judge({ kind: 'reaches', from: 'a', to: '10.0.1.2', minReplies: 2 }, swapped([OWN]))).toMatchObject({
      passed: false,
      failure: CHECK_FAILURES.ownAddress,
      received: 3,
    })
  })

  it('judges by the ping alone when zebra’s table is empty or holds the address from elsewhere', () => {
    const check = { kind: 'reaches', from: 'a', to: '10.0.1.2', minReplies: 2 } as const
    expect(judge(check, swapped([])).passed).toBe(true)
    expect(judge(check, swapped([{ ...OWN, protocol: 'connected', prefix: '10.0.1.0/30' }])).passed).toBe(true)
    expect(judge(check, swapped([{ ...OWN, protocol: 'static' }])).passed).toBe(true)
  })

  it('asks for zebra’s table of the router that pings', () => {
    const check = { kind: 'reaches', from: 'a', to: '10.0.1.2', minReplies: 2 } as const
    expect(stateRequestOf({ objectives: [{ id: 'reaches', text: '', check }] })).toEqual({
      routers: { a: ['rib'] },
      pings: [{ from: 'a', to: '10.0.1.2', count: 3 }],
    })
  })
})

describe('config', () => {
  it('finds a line in its block, in the running or the saved configuration', () => {
    const line = { kind: 'config', router: 'a', block: ['interface a-b'], line: 'ip address 10.0.1.1/30' } as const
    expect(judge({ ...line, source: 'running' })).toMatchObject({ passed: true, found: 'ip address 10.0.1.1/30' })
    expect(judge({ ...line, source: 'saved' }).passed).toBe(true)
  })

  it('reads what FRR was last started from, and finds nothing before a restart', () => {
    const check = { kind: 'config', router: 'a', source: 'started', block: ['interface lo'], line: 'description' }
    const routerA = STATE.routers.a
    const restarted = {
      ...STATE,
      routers: { ...STATE.routers, a: { ...routerA, startedConfig: 'interface lo\n description kept\nexit\n' } },
    }
    const never = { ...STATE, routers: { ...STATE.routers, a: { ...routerA, startedConfig: null } } }
    expect(judge(check as CheckDefinition, restarted)).toMatchObject({ passed: true, found: 'description kept' })
    expect(judge(check as CheckDefinition, never)).toMatchObject({
      passed: false,
      failure: CHECK_FAILURES.notConfigured,
    })
    expect(judge(check as CheckDefinition)).toMatchObject({ passed: false, failure: CHECK_FAILURES.notChecked })
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

  it('with absent, passes only when a configuration exists and the line is gone from its block', () => {
    const check = {
      kind: 'config',
      router: 'a',
      source: 'started',
      block: ['interface a-c'],
      line: 'shutdown',
      absent: true,
    } as const
    const startedFrom = (startedConfig: string | null): MachineState => ({
      ...STATE,
      routers: { ...STATE.routers, a: { ...STATE.routers.a, startedConfig } },
    })
    expect(judge(check, startedFrom('interface a-c\n ip address 10.0.3.1/30\nexit\n'))).toEqual({
      kind: 'config',
      passed: true,
      failure: null,
      router: 'a',
      source: 'started',
      found: null,
    })
    expect(judge(check, startedFrom('interface a-c\n shutdown\nexit\n'))).toMatchObject({
      passed: false,
      failure: CHECK_FAILURES.stillConfigured,
      found: 'shutdown',
    })
    expect(judge(check, startedFrom('interface a-b\n shutdown\nexit\n')).passed).toBe(true)
    expect(judge(check, startedFrom(null))).toMatchObject({ passed: false, failure: CHECK_FAILURES.noConfig })
    expect(judge(check)).toMatchObject({ passed: false, failure: CHECK_FAILURES.notChecked })
  })

  it('fails on a router whose FRR is down: it runs no configuration', () => {
    expect(judge({ kind: 'config', router: 'b', source: 'running', block: [], line: 'hostname' })).toMatchObject({
      passed: false,
      failure: CHECK_FAILURES.notConfigured,
    })
  })
})

describe('rib', () => {
  // Router a of The Backup Path, as zebra held 10.255.0.3/32 on the Machine at each step.
  const THROUGH_B = {
    prefix: '10.255.0.3/32',
    protocol: 'static',
    distance: 1,
    metric: 0,
    selected: true,
    installed: true,
    nextHops: [{ via: '10.0.1.2', interface: 'a-b' }],
  }
  const DIRECT = { ...THROUGH_B, nextHops: [{ via: '10.0.2.2', interface: 'a-c' }] }
  const SHARED = { ...THROUGH_B, nextHops: [...THROUGH_B.nextHops, ...DIRECT.nextHops] }
  const WAITING = { ...THROUGH_B, distance: 10, selected: false, installed: false }
  const CONNECTED = {
    prefix: '10.0.1.0/30',
    protocol: 'connected',
    distance: 0,
    metric: 0,
    selected: true,
    installed: true,
    nextHops: [{ via: null, interface: 'a-b' }],
  }
  const withRib = (...rib: (typeof THROUGH_B | typeof CONNECTED)[]): MachineState => ({
    routers: { a: { rib } },
    pings: [],
  })
  const backup = {
    kind: 'rib',
    router: 'a',
    prefix: '10.255.0.3/32',
    protocol: 'static',
    via: '10.0.1.2',
    selected: false,
  } as const

  it('passes when the route through b waits in zebra’s table, not selected', () => {
    expect(judge(backup, withRib(CONNECTED, WAITING, DIRECT))).toEqual({
      kind: 'rib',
      passed: true,
      failure: null,
      router: 'a',
      routes: [WAITING, DIRECT],
      found: WAITING,
    })
  })

  it('fails while that route is selected, alone or sharing the traffic, and once it is gone', () => {
    expect(judge(backup, withRib(CONNECTED, THROUGH_B))).toMatchObject({
      passed: false,
      failure: CHECK_FAILURES.wrongRibRoute,
      routes: [THROUGH_B],
      found: null,
    })
    expect(judge(backup, withRib(SHARED)).failure).toBe(CHECK_FAILURES.wrongRibRoute)
    expect(judge(backup, withRib(DIRECT)).failure).toBe(CHECK_FAILURES.wrongRibRoute)
    expect(judge(backup, withRib(CONNECTED))).toMatchObject({ failure: CHECK_FAILURES.noRibRoute, routes: [] })
  })

  it('takes either state when selected is left out, and narrows by protocol', () => {
    const { selected: _, ...anyState } = backup
    expect(judge(anyState, withRib(THROUGH_B)).passed).toBe(true)
    expect(judge(anyState, withRib(WAITING)).passed).toBe(true)
    expect(judge({ ...anyState, protocol: 'ospf' }, withRib(THROUGH_B)).failure).toBe(CHECK_FAILURES.wrongRibRoute)
    expect(judge({ kind: 'rib', router: 'a', prefix: '10.0.1.0/30' }, withRib(CONNECTED)).passed).toBe(true)
  })

  it('is not checked before zebra’s table was read, and finds nothing on a router whose zebra is down', () => {
    expect(judge(backup).failure).toBe(CHECK_FAILURES.notChecked)
    expect(judge(backup, withRib()).failure).toBe(CHECK_FAILURES.noRibRoute)
  })

  it('asks for zebra’s table of the router it names', () => {
    expect(stateRequestOf({ objectives: [{ id: 'backup', text: '', check: backup }] })).toEqual({
      routers: { a: ['rib'] },
      pings: [],
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
      // zebra's table on a, the router that pings: a ping to a's own address proves nothing.
      routers: { a: ['daemons', 'routes', 'rib', 'savedConfig'], c: ['routes'] },
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

const linkState = (check: CheckDefinition) => judge(check, LINK_STATE)

describe('peer', () => {
  it('passes for an OSPF peer that is Full, on the interface asked for', () => {
    expect(
      linkState({ kind: 'peer', router: 'square', protocol: 'ospf', peer: '10.255.0.2', interface: 'a-b' })
    ).toEqual({
      kind: 'peer',
      passed: true,
      failure: null,
      router: 'square',
      protocol: 'ospf',
      peers: [
        { peer: '10.255.0.2', interface: 'a-b', state: 'Full' },
        { peer: '10.255.0.3', interface: 'a-c', state: 'Full' },
      ],
      found: { peer: '10.255.0.2', interface: 'a-b', state: 'Full' },
    })
  })

  it('fails for a peer stuck in ExStart, and says where it stopped', () => {
    expect(linkState({ kind: 'peer', router: 'mtu', protocol: 'ospf', peer: '10.255.0.2' })).toMatchObject({
      passed: false,
      failure: CHECK_FAILURES.peerNotFull,
      found: { peer: '10.255.0.2', interface: 'a-b', state: 'ExStart' },
    })
  })

  it('fails with no peer on another interface, for another router id, or with the daemon down', () => {
    const checks: CheckDefinition[] = [
      { kind: 'peer', router: 'square', protocol: 'ospf', peer: '10.255.0.2', interface: 'a-c' },
      { kind: 'peer', router: 'square', protocol: 'ospf', peer: '10.255.0.4' },
      { kind: 'peer', router: 'ipv6', protocol: 'ospf', peer: '10.255.0.2' },
    ]
    for (const check of checks) {
      expect(linkState(check)).toMatchObject({ passed: false, failure: CHECK_FAILURES.noPeer, found: null })
    }
  })

  it('reads OSPFv3 peers, Full, from ospf6d’s own table', () => {
    const check: CheckDefinition = { kind: 'peer', router: 'ipv6', protocol: 'ospf6', peer: '10.255.0.2' }
    expect(linkState({ ...check, interface: 'a-b' }).passed).toBe(true)
  })

  it('reads IS-IS adjacencies, Up, by hostname and level', () => {
    const check: CheckDefinition = { kind: 'peer', router: 'isis', protocol: 'isis', peer: 'b', interface: 'a-b' }
    expect(linkState({ ...check, level: 2 }).passed).toBe(true)
    expect(linkState({ ...check, level: 1 }).failure).toBe(CHECK_FAILURES.noPeer)
  })

  it('asks for the neighbor table of its protocol', () => {
    const objectives = [
      { id: 'o', text: '', check: { kind: 'peer', router: 'a', protocol: 'ospf6', peer: '10.255.0.2' } },
      { id: 'i', text: '', check: { kind: 'peer', router: 'a', protocol: 'isis', peer: 'b' } },
    ] as const
    expect(stateRequestOf({ objectives })).toEqual({ routers: { a: ['ospf6Neighbors', 'isisNeighbors'] }, pings: [] })
  })
})

describe('lsa', () => {
  it('finds a router-LSA and a summary in their area, and an external in none', () => {
    expect(
      linkState({
        kind: 'lsa',
        router: 'square',
        type: 'summary',
        area: '0.0.0.0',
        id: '10.255.0.4',
        advRouter: '10.255.0.4',
      })
    ).toEqual({
      kind: 'lsa',
      passed: true,
      failure: null,
      router: 'square',
      found: { area: '0.0.0.0', type: 'summary', id: '10.255.0.4', advRouter: '10.255.0.4' },
    })
    expect(linkState({ kind: 'lsa', router: 'square', type: 'router', area: '0.0.0.0', id: '10.255.0.3' }).passed).toBe(
      true
    )
    expect(linkState({ kind: 'lsa', router: 'square', type: 'external', id: '192.0.2.0' }).passed).toBe(true)
  })

  it('fails for another area, type or sender', () => {
    const checks: CheckDefinition[] = [
      { kind: 'lsa', router: 'square', type: 'summary', area: '0.0.0.1', id: '10.255.0.4' },
      { kind: 'lsa', router: 'square', type: 'router', area: '0.0.0.0', id: '192.0.2.0' },
      { kind: 'lsa', router: 'square', type: 'summary', area: '0.0.0.0', id: '10.255.0.4', advRouter: '10.255.0.2' },
    ]
    for (const check of checks) {
      expect(linkState(check)).toMatchObject({ passed: false, failure: CHECK_FAILURES.noLsa, found: null })
    }
  })

  it('with absent, passes only when the database can be read and lacks the LSA', () => {
    const missing: CheckDefinition = {
      kind: 'lsa',
      router: 'square',
      type: 'router',
      area: '0.0.0.0',
      id: '10.255.0.9',
    }
    expect(linkState({ ...missing, absent: true }).passed).toBe(true)
    expect(linkState({ kind: 'lsa', router: 'square', type: 'external', id: '192.0.2.0', absent: true })).toMatchObject(
      {
        failure: CHECK_FAILURES.lsaPresent,
        found: { type: 'external', id: '192.0.2.0' },
      }
    )
    expect(linkState({ kind: 'lsa', router: 'isis', type: 'external', id: '192.0.2.0', absent: true }).failure).toBe(
      CHECK_FAILURES.noDatabase
    )
    expect(linkState({ kind: 'lsa', router: 'isis', type: 'external', id: '192.0.2.0' }).failure).toBe(
      CHECK_FAILURES.noLsa
    )
  })
})

describe('route vias', () => {
  it('passes when the kernel uses exactly those next hops together, in any order', () => {
    const check: CheckDefinition = { kind: 'route', router: 'square', to: '10.255.0.4', protocol: 'ospf' }
    expect(linkState({ ...check, vias: ['10.0.2.2', '10.0.1.2'] }).passed).toBe(true)
  })

  it('fails for a route with one of them only, or with fewer than asked', () => {
    expect(
      linkState({ kind: 'route', router: 'square', to: '10.255.0.2', vias: ['10.0.1.2', '10.0.2.2'] }).failure
    ).toBe(CHECK_FAILURES.wrongRoute)
    expect(
      linkState({ kind: 'route', router: 'square', to: '10.255.0.4', vias: ['10.0.1.2', '10.0.2.2', '10.0.3.2'] })
        .failure
    ).toBe(CHECK_FAILURES.wrongRoute)
  })
})

describe('reaches with a size, and over IPv6', () => {
  it('judges a large ping by its own result, apart from a small one to the same address', () => {
    expect(linkState({ kind: 'reaches', from: 'mtu', to: '10.0.1.2', minReplies: 2, size: 2000 })).toMatchObject({
      passed: false,
      failure: CHECK_FAILURES.unreachable,
      size: 2000,
      received: 0,
    })
    expect(linkState({ kind: 'reaches', from: 'mtu', to: '10.0.1.2', minReplies: 2 }).passed).toBe(true)
  })

  it('asks for each size as a ping of its own', () => {
    const objectives = [
      { id: 'big', text: '', check: { kind: 'reaches', from: 'a', to: '10.0.1.2', minReplies: 2, size: 2000 } },
      { id: 'small', text: '', check: { kind: 'reaches', from: 'a', to: '10.0.1.2', minReplies: 2 } },
      { id: 'v6', text: '', check: { kind: 'reaches', from: 'a', to: 'fd00::2', minReplies: 2 } },
    ] as const
    expect(stateRequestOf({ objectives })).toEqual({
      routers: { a: ['rib', 'rib6'] },
      pings: [
        { from: 'a', to: '10.0.1.2', count: 3, size: 2000 },
        { from: 'a', to: '10.0.1.2', count: 3 },
        { from: 'a', to: 'fd00::2', count: 3 },
      ],
    })
  })

  it('reaches an IPv6 address, and tells the router’s own from zebra’s IPv6 table', () => {
    expect(linkState({ kind: 'reaches', from: 'ipv6', to: 'fd00::2', minReplies: 2 }).passed).toBe(true)
    expect(linkState({ kind: 'reaches', from: 'ipv6', to: 'fd00::1', minReplies: 2 }).failure).toBe(
      CHECK_FAILURES.ownAddress
    )
  })
})

describe('rib over IPv6', () => {
  it('reads zebra’s IPv6 table for an IPv6 prefix, however it is written', () => {
    expect(
      linkState({ kind: 'rib', router: 'ipv6', prefix: 'fd00:0::2/128', protocol: 'ospf6', selected: true })
    ).toMatchObject({
      passed: true,
      found: { prefix: 'fd00::2/128', nextHops: [{ via: 'fe80::8402:2aff:fea8:c6f9', interface: 'a-b' }] },
    })
    expect(linkState({ kind: 'rib', router: 'ipv6', prefix: 'fd00::3/128' }).failure).toBe(CHECK_FAILURES.noRibRoute)
    const objectives = [{ id: 'r', text: '', check: { kind: 'rib', router: 'a', prefix: 'fd00::3/128' } }] as const
    expect(stateRequestOf({ objectives })).toEqual({ routers: { a: ['rib6'] }, pings: [] })
  })
})
