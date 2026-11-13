import { MISSION_FIXTURE } from '@features/mission/utils/fixtures'
import type { CheckDefinition, CheckResult, MissionVerdict, RouteHop } from '@peerfall/game/types'
import { describe, expect, it } from 'vitest'
import { evidenceText, failureText, guideObjectivesOf, probeNamesOf } from './objective-text.util'

const NAMES = { from: 'a', destination: '10.255.0.3', target: 'c' }

const hop = (name: string, via: string): RouteHop => ({
  prefix: '10.255.0.3',
  interface: name,
  via,
  nextHops: [{ via, interface: name }],
  protocol: 'ospf',
  atMs: 0,
})
const DIRECT = hop('a-c', '10.0.2.2')
const THROUGH_B = hop('a-b', '10.0.1.2')
const SHARED: RouteHop = {
  ...DIRECT,
  nextHops: [
    { via: '10.0.2.2', interface: 'a-c' },
    { via: '10.0.1.2', interface: 'a-b' },
  ],
}

const REACHABLE: CheckDefinition = { kind: 'reachable', minReplies: 3 }
const PATH: CheckDefinition = { kind: 'path', before: 'a-c' }
const RECOVERY: CheckDefinition = { kind: 'recovery', via: 'a-b' }
const DETECTED: CheckDefinition = { kind: 'detected-by', event: 'bfd_session_down' }

describe('failureText', () => {
  it('says a check that needs the fault has not been tested, and how to test it', () => {
    const result: CheckResult = { kind: 'recovery', passed: false, failure: 'no_fault', recovery: null, limitMs: 2000 }
    expect(failureText(RECOVERY, result, NAMES)).toBe(
      'the link was not broken, and this is judged only when it breaks. Use **Break the link**.'
    )
  })

  it('counts the replies that came back and says what a reply is', () => {
    const none: CheckResult = { kind: 'reachable', passed: false, failure: 'unreachable', replies: 0 }
    const one: CheckResult = { ...none, replies: 1 }
    expect(failureText(REACHABLE, none, NAMES)).toBe(
      'No reply came back from 10.255.0.3. It takes 3. A reply is one packet that reached the far router and came back.'
    )
    expect(failureText(REACHABLE, one, NAMES)).toContain('Only 1 reply came back from 10.255.0.3.')
  })

  it('explains what a route is when the router has none', () => {
    const result: CheckResult = { kind: 'path', passed: false, failure: 'no_route', before: null, after: null }
    const text = failureText(PATH, result, NAMES)
    expect(text).toContain('a had no route to 10.255.0.3')
    expect(text).toContain("A route is the entry in a router's table")
  })

  it('names the interface traffic really left through, and the one the objective asks for', () => {
    const result: CheckResult = { kind: 'path', passed: false, failure: 'wrong_path', before: THROUGH_B, after: null }
    expect(failureText(PATH, result, NAMES)).toContain(
      'Before the link broke, a sent traffic for 10.255.0.3 out of `a-b`, not only `a-c`.'
    )
    const shared: CheckResult = { ...result, before: SHARED }
    expect(failureText(PATH, shared, NAMES)).toContain('out of `a-c` and `a-b`, not only `a-c`')
    const after: CheckResult = { kind: 'path', passed: false, failure: 'wrong_path', before: null, after: DIRECT }
    expect(failureText({ kind: 'path', after: 'a-b' }, after, NAMES)).toBe(
      'After the link broke, traffic came back out of `a-c`, not only `a-b`.'
    )
  })

  it('says traffic stayed lost when it never came back the expected way', () => {
    const result: CheckResult = {
      kind: 'recovery',
      passed: false,
      failure: 'not_recovered',
      recovery: null,
      limitMs: 2000,
    }
    expect(failureText(RECOVERY, result, NAMES)).toBe(
      'Replies never came back through `a-b` before the run ended: traffic to c stayed lost.'
    )
  })

  it('gives the time it took beside the target when recovery was too slow', () => {
    const result: CheckResult = {
      kind: 'recovery',
      passed: false,
      failure: 'too_slow',
      recovery: { sequence: 700, atMs: 34_940, afterFaultMs: 34_940, route: THROUGH_B },
      limitMs: 2000,
    }
    expect(failureText(RECOVERY, result, NAMES)).toBe(
      'Traffic was back after 34.9 s, over the 2.00 s target. Something has to notice the dead link sooner.'
    )
    const outage: CheckResult = {
      kind: 'outage',
      passed: false,
      failure: 'too_slow',
      outage: { fromMs: 0, toMs: 3100, durationMs: 3100 },
      limitMs: 2000,
    }
    expect(failureText({ kind: 'outage' }, outage, NAMES)).toBe('Traffic was lost for 3.10 s, over the 2.00 s limit.')
  })

  it('says nothing noticed, or that the wrong thing did, and what the two detectors are', () => {
    const missed: CheckResult = { kind: 'detected-by', passed: false, failure: 'not_detected', detection: null }
    expect(failureText(DETECTED, missed, NAMES)).toContain('Nothing reported the dead link before the run ended.')
    const wrong: CheckResult = {
      kind: 'detected-by',
      passed: false,
      failure: 'wrong_detector',
      detection: { event: 'ospf_dead_timer_expired', router: 'c', interface: 'c-a', atMs: 0, afterFaultMs: 31_210 },
    }
    const text = failureText(DETECTED, wrong, NAMES)
    expect(text).toContain("OSPF's dead timer noticed the fault first, not BFD.")
    expect(text).toContain('BFD is a small protocol')
  })
})

describe('checks that read the routers as they are', () => {
  const DAEMONS: CheckDefinition = { kind: 'daemons', router: 'a', daemons: ['zebra', 'staticd'] }
  const ROUTE: CheckDefinition = { kind: 'route', router: 'a', to: '10.255.0.3', protocol: 'static' }
  const REACHES: CheckDefinition = { kind: 'reaches', from: 'a', to: '10.255.0.3', minReplies: 3 }
  const CONFIG: CheckDefinition = { kind: 'config', router: 'a', source: 'saved', block: [], line: 'ip route' }
  const OSPF_ROUTE = { prefix: '10.255.0.3', protocol: 'ospf', nextHops: [{ via: '10.0.2.2', interface: 'a-c' }] }

  it('says nothing was read from the routers yet', () => {
    const result: CheckResult = { kind: 'route', passed: false, failure: 'not_checked', router: 'a', route: null }
    expect(failureText(ROUTE, result, NAMES)).toBe('this has not been checked on the routers yet.')
  })

  it('names the daemons that did not answer and says what a daemon is', () => {
    const result: CheckResult = {
      kind: 'daemons',
      passed: false,
      failure: 'daemons_down',
      router: 'a',
      running: ['zebra'],
      missing: ['staticd'],
    }
    const text = failureText(DAEMONS, result, NAMES)
    expect(text).toContain('`staticd` did not answer on router a.')
    expect(text).toContain('A daemon is one of the programs FRR is made of')
    expect(evidenceText({ ...result, passed: true, failure: null, missing: [] }, NAMES)).toContain(
      '`zebra` answers on router a.'
    )
  })

  it('shows the route the kernel has when it is not the one asked for, or that it has none', () => {
    const wrong: CheckResult = { kind: 'route', passed: false, failure: 'wrong_route', router: 'a', route: OSPF_ROUTE }
    expect(failureText(ROUTE, wrong, NAMES)).toContain(
      'Router a has a route there, but not the one asked for: `10.255.0.3 from ospf via 10.0.2.2 on a-c`.'
    )
    const none: CheckResult = { kind: 'route', passed: false, failure: 'no_route', router: 'a', route: null }
    expect(failureText(ROUTE, none, NAMES)).toContain('Router a has no route there.')
    expect(evidenceText({ ...wrong, passed: true, failure: null }, NAMES)).toContain(
      "Router a's kernel has `10.255.0.3 from ospf via 10.0.2.2 on a-c`."
    )
  })

  it('counts the packets that were answered', () => {
    const result: CheckResult = {
      kind: 'reaches',
      passed: false,
      failure: 'unreachable',
      from: 'a',
      to: '10.255.0.3',
      sent: 3,
      received: 1,
    }
    expect(failureText(REACHES, result, NAMES)).toContain('1 of 3 packets from a to 10.255.0.3 was answered.')
    expect(evidenceText({ ...result, passed: true, failure: null, received: 3 }, NAMES)).toContain(
      '3 of 3 packets from a to 10.255.0.3 were answered.'
    )
  })

  it('says when the router answered its own address', () => {
    const result: CheckResult = {
      kind: 'reaches',
      passed: false,
      failure: 'own_address',
      from: 'a',
      to: '10.0.1.2',
      sent: 3,
      received: 3,
    }
    expect(failureText(REACHES, result, NAMES)).toContain(
      "10.0.1.2 is router a's own address: a answered itself, not another router."
    )
  })

  it('tells the running configuration from the saved one', () => {
    const result: CheckResult = {
      kind: 'config',
      passed: false,
      failure: 'not_configured',
      router: 'a',
      source: 'saved',
      found: null,
    }
    const text = failureText(CONFIG, result, NAMES)
    expect(text).toContain("Router a's saved configuration does not have that line yet.")
    expect(text).toContain('`frr.conf`, is what it starts with after a restart')
    expect(
      evidenceText({ ...result, passed: true, failure: null, found: ' ip route 10.255.0.3/32 10.0.2.2' }, NAMES)
    ).toContain("Router a's saved configuration has `ip route 10.255.0.3/32 10.0.2.2`.")
  })

  it('names what zebra holds for the prefix, selected or waiting, when it is not the route asked for', () => {
    const backup: CheckDefinition = {
      kind: 'rib',
      router: 'a',
      prefix: '10.255.0.3/32',
      protocol: 'static',
      via: '10.0.1.2',
      selected: false,
    }
    const throughB = {
      prefix: '10.255.0.3/32',
      protocol: 'static',
      distance: 1,
      metric: 0,
      selected: true,
      installed: true,
      nextHops: [{ via: '10.0.1.2', interface: 'a-b' }],
    }
    const selected: CheckResult = {
      kind: 'rib',
      passed: false,
      failure: 'wrong_rib_route',
      router: 'a',
      routes: [throughB],
      found: null,
    }
    const text = failureText(backup, selected, NAMES)
    expect(text).toContain(
      "Router a's zebra holds `10.255.0.3/32 from static via 10.0.1.2 distance 1 selected`, but not the route this objective asks for."
    )
    expect(text).toContain('only the selected route goes into the kernel')
    expect(failureText(backup, { ...selected, failure: 'no_rib_route', routes: [] }, NAMES)).toContain(
      "Router a's zebra has no route for `10.255.0.3/32`."
    )
    const waiting = { ...throughB, distance: 10, selected: false, installed: false }
    expect(
      evidenceText({ ...selected, passed: true, failure: null, routes: [waiting], found: waiting }, NAMES)
    ).toContain("Router a's zebra holds `10.255.0.3/32 from static via 10.0.1.2 distance 10 not selected`.")
  })

  it('says which line is still there, or that there is no configuration yet, when a line must be gone', () => {
    const still: CheckResult = {
      kind: 'config',
      passed: false,
      failure: 'still_configured',
      router: 'a',
      source: 'started',
      found: ' shutdown',
    }
    expect(failureText(CONFIG, still, NAMES)).toContain("Router a's started configuration still has `shutdown`.")
    expect(failureText(CONFIG, { ...still, failure: 'no_config', found: null }, NAMES)).toContain(
      'Router a has no started configuration to read yet.'
    )
  })
})

describe('evidenceText', () => {
  it('puts each term in plain words beside the evidence that shows it', () => {
    expect(evidenceText({ kind: 'reachable', passed: true, failure: null, replies: 60 }, NAMES)).toBe(
      '60 replies came back from 10.255.0.3. A reply is one packet that reached the far router and came back.'
    )
    const path = evidenceText({ kind: 'path', passed: true, failure: null, before: DIRECT, after: null }, NAMES)
    expect(path).toContain('a sends traffic for 10.255.0.3 out of `a-c`.')
    expect(path).toContain("An interface is a router's end of a link.")
  })

  it('gives the recovery time beside its target', () => {
    const result: CheckResult = {
      kind: 'recovery',
      passed: true,
      failure: null,
      recovery: { sequence: 76, atMs: 796, afterFaultMs: 796, route: THROUGH_B },
      limitMs: 2000,
    }
    expect(evidenceText(result, NAMES)).toBe(
      'Traffic was back through `a-b` 0.80 s after the link broke, inside the 2.00 s target.'
    )
  })
})

describe('guideObjectivesOf', () => {
  const mission = MISSION_FIXTURE

  it('explains a term under the first objective that brings it up, never again in the list', () => {
    const daemons = (id: string, router: string) => ({
      id,
      text: `FRR runs on ${router}.`,
      check: { kind: 'daemons', router, daemons: ['zebra'] } as CheckDefinition,
    })
    const twoRouters = { ...mission, objectives: [daemons('on-a', 'a'), daemons('on-b', 'b')] }
    const verdict: MissionVerdict = {
      passed: true,
      objectives: ['a', 'b'].map((router) => ({
        objectiveId: `on-${router}`,
        result: { kind: 'daemons', passed: true, failure: null, router, running: ['zebra'], missing: [] },
      })),
    }
    const [first, second] = guideObjectivesOf(twoRouters, verdict)
    expect(first?.evidence).toBe(
      '`zebra` answers on router a. A daemon is one of the programs FRR is made of: each routing protocol has its own, and `zebra` hands their routes to the kernel.'
    )
    expect(second?.evidence).toBe('`zebra` answers on router b.')
  })

  it('says a router with no route refuses to send, as Linux does', () => {
    const result: CheckResult = { kind: 'route', passed: false, failure: 'no_route', router: 'a', route: null }
    expect(failureText({ kind: 'route', router: 'a', to: '10.255.0.3' }, result, NAMES)).toContain(
      'Without one, Linux refuses to send them: `Network unreachable`.'
    )
  })

  it('knows whose address the probe is sent to', () => {
    expect(probeNamesOf(mission)).toEqual(NAMES)
  })

  it('leaves every objective open, with nothing to say, before the first run', () => {
    expect(guideObjectivesOf(mission, null)).toEqual(
      mission.objectives.map(({ id, text }) => ({ id, text, passed: false, observed: null, evidence: null }))
    )
  })

  it('ticks what a probe showed and says the fault has not been tried', () => {
    const verdict: MissionVerdict = {
      passed: false,
      objectives: [
        { objectiveId: 'reaches-c', result: { kind: 'reachable', passed: true, failure: null, replies: 60 } },
        {
          objectiveId: 'direct-while-healthy',
          result: { kind: 'path', passed: true, failure: null, before: DIRECT, after: null },
        },
        {
          objectiveId: 'recovers-through-b',
          result: { kind: 'recovery', passed: false, failure: 'no_fault', recovery: null, limitMs: 2000 },
        },
      ],
    }
    const [reaches, direct, recovers] = guideObjectivesOf(mission, verdict)
    expect(reaches).toMatchObject({ passed: true, observed: null })
    expect(reaches?.evidence).toContain('60 replies')
    expect(direct?.evidence).toContain('`a-c`')
    expect(recovers).toMatchObject({ passed: false, evidence: null })
    expect(recovers?.observed).toContain('the link was not broken')
  })
})
