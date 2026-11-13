import { describe, expect, it } from 'vitest'
import { EXAMPLE_CHAPTERS_YAML, EXAMPLE_MISSION_YAML, STATE_MISSION_YAML } from '#test/index'
import { validateChapters } from '#utils/validate/chapters.schema'
import { validateMission } from '#utils/validate/mission.schema'

const YAML = EXAMPLE_MISSION_YAML
const [REACHES, DIRECT, RECOVERS] = YAML.objectives

/** Every problem found in the example mission with `fields` changed. */
function errorsWith(fields: Readonly<Record<string, unknown>>): readonly string[] {
  const result = validateMission({ ...YAML, ...fields })
  return result.ok ? [] : result.errors
}

describe('validateMission', () => {
  it('accepts a mission that uses every field and returns it typed', () => {
    const result = validateMission(YAML)
    expect(result).toMatchObject({
      ok: true,
      value: {
        id: 'the-link-that-never-went-down',
        version: 1,
        chapter: 'recover-from-failure',
        fault: { link: ['a', 'c'] },
        probe: { id: 'a-to-c', from: 'a', destination: '10.255.0.3', intervalMs: 50 },
        recoveryTargetMs: 2000,
      },
    })
    expect(result.ok && result.value.network.routers.map((router) => router.name)).toEqual(['a', 'b', 'c'])
    expect(result.ok && result.value.objectives.map((objective) => objective.check)).toEqual([
      { kind: 'reachable', minReplies: 3 },
      { kind: 'path', before: 'a-c' },
      { kind: 'recovery', via: 'a-b' },
    ])
  })

  it('reports every problem at once, each with the path of its field', () => {
    expect(
      errorsWith({
        id: 'The Link',
        version: 0,
        title: '',
        objective: undefined,
        recoveryTargetMs: '2s',
        dificulty: 'hard',
      })
    ).toEqual([
      'dificulty: unknown field (expected one of: id, version, title, summary, minutes, chapter, objective, prerequisites, teaches, names, uses, network, fault, probe, recoveryTargetMs, restartOnCheck, objectives, hints, chips, codex, story)',
      'id: expected a kebab-case id like recover-from-failure, got "The Link"',
      'version: expected a number from 1 to 9007199254740991, got 0',
      'title: expected non-empty text, got empty text',
      'objective: expected non-empty text, got nothing',
      'recoveryTargetMs: expected a whole number, got text',
    ])
  })

  it('refuses something that is not a mission at all', () => {
    expect(validateMission('mission')).toMatchObject({ ok: false })
    expect(validateMission(null)).toMatchObject({ ok: false })
  })

  describe('network', () => {
    it("reports the shape of the network's parts", () => {
      const [a, b, c] = YAML.network.routers
      const [ab] = YAML.network.links
      expect(
        errorsWith({
          network: {
            routers: [{ ...a, daemons: ['ospfd', 'ripd'] }, { ...b, config: 7 }, c],
            links: [ab, { ends: [{ router: 'a', address: '10.0.2.1/30' }] }, { ends: 'a-c' }],
          },
        })
      ).toEqual([
        'network.routers[0].daemons[1]: expected one of staticd, ospfd, ospf6d, isisd, bgpd, bfdd, got "ripd"',
        'network.routers[1].config: expected text, got a number',
        "network.links[1].ends: expected the link's two ends, got 1",
        'network.links[2].ends: expected a list, got text',
      ])
    })

    it("reports what the Machine can't build, under the network's path", () => {
      const [a, b, c] = YAML.network.routers
      expect(
        errorsWith({
          network: {
            routers: [{ ...a, name: 'Router-A' }, b, c],
            links: [
              {
                ends: [
                  { router: 'b', address: '10.0.3.1' },
                  { router: 'z', address: '10.0.3.2/30' },
                ],
              },
            ],
          },
        })
      ).toEqual([
        'network.routers[0].name: expected a lower-case name of at most 6 characters, got "Router-A"',
        'network.links[0].ends[0].address: expected an address like 10.0.2.1/30, got "10.0.3.1"',
        'network.links[0].ends[1].router: no router named "z"',
      ])
    })

    it('needs at least one router', () => {
      expect(errorsWith({ network: { routers: [], links: [] } })).toEqual([
        'network.routers: expected at least one router',
      ])
    })
  })

  describe('fault and probe', () => {
    it('names the faulted link by its two routers, in the order the network gives them', () => {
      expect(errorsWith({ fault: { link: ['a'] } })).toEqual([
        "fault.link: expected the link's two routers like [a, c], got 1",
      ])
      expect(errorsWith({ fault: { link: ['c', 'a'] } })).toEqual([
        'fault.link: the network gives this link as [a, c]: name it in that order',
      ])
      expect(errorsWith({ fault: { link: ['a', 'z'] } })).toEqual([
        'fault.link: the network has no link between "a" and "z"',
      ])
    })

    it('checks the probe against the network', () => {
      expect(errorsWith({ probe: { ...YAML.probe, from: 'z' } })).toEqual(['probe.from: no router named "z"'])
      expect(errorsWith({ probe: { ...YAML.probe, source: '10.255.0.2' } })).toEqual([
        'probe.source: "10.255.0.2" is not an address of router "a"',
      ])
      expect(errorsWith({ probe: { ...YAML.probe, source: '10.0.2.1' } })).toEqual([])
    })

    it('checks each field of the probe', () => {
      expect(
        errorsWith({ probe: { id: 'A to C', from: 'a', source: '10.255.0.1/32', destination: 'c', intervalMs: 5 } })
      ).toEqual([
        'probe.id: expected a lower-case name of at most 16 characters like a-to-c, got "A to C"',
        'probe.source: expected an address like 10.255.0.3, got "10.255.0.1/32"',
        'probe.destination: expected an address like 10.255.0.3, got "c"',
        'probe.intervalMs: expected a number from 10 to 10000, got 5',
      ])
    })
  })

  describe('hints', () => {
    const [nudge, concept, spot] = YAML.hints

    it('wants exactly three: nudge, concept, spot', () => {
      expect(errorsWith({ hints: [nudge, concept] })).toEqual([
        'hints: expected exactly 3 hints (nudge, concept, spot), got 2',
      ])
      expect(errorsWith({ hints: [nudge, concept, spot, nudge] })).toEqual([
        'hints: expected exactly 3 hints (nudge, concept, spot), got 4',
      ])
      expect(errorsWith({ hints: undefined })).toEqual(['hints: expected a list, got nothing'])
    })

    it('lets only the spot name a command', () => {
      expect(errorsWith({ hints: [{ ...nudge, command: 'show ip route' }, concept, spot] })).toEqual([
        'hints[0].command: only the third hint (the spot) may name a command',
      ])
      expect(errorsWith({ hints: [nudge, concept, { text: 'Look.', comand: 'show' }] })).toEqual([
        'hints[2].comand: unknown field (expected one of: text, command)',
      ])
    })
  })

  describe('teaching fields', () => {
    it('reads the summary, minutes, concepts, chips, cards and story sections', () => {
      const result = validateMission(YAML)
      expect(result.ok && result.value).toMatchObject({
        summary: 'Make the network notice a dead link in under a second.',
        minutes: 20,
        teaches: ['bfd-session'],
        names: ['bfd-timers'],
        uses: ['ospf-adjacency'],
        chips: [{ command: 'show ip ospf neighbor' }],
        codex: [{ id: 'bfd', term: 'BFD', sources: ['bfdd/bfd.c'], tryIt: 'show bfd peers' }],
        story: { scene: 'story.md#scene', debrief: 'story.md#debrief', realWorld: 'story.md#real-world' },
      })
    })

    it('leaves names, chips and cards empty when they are left out', () => {
      const { names: _names, chips: _chips, codex: _codex, ...rest } = YAML
      const result = validateMission(rest)
      expect(result.ok && [result.value.names, result.value.chips, result.value.codex]).toEqual([[], [], []])
    })

    it('keeps to the concept budget and says each concept once', () => {
      expect(errorsWith({ teaches: ['a', 'b', 'c', 'd'] })).toEqual(['teaches: expected at most 3 concepts, got 4'])
      expect(errorsWith({ uses: ['bfd-session'] })).toEqual(['uses: "bfd-session" is already in teaches'])
    })

    it('checks every card field', () => {
      const [card] = YAML.codex
      expect(
        errorsWith({
          codex: [
            { ...card, id: 'Card', deepens: 'card', sources: ['/abs path'], docs: 'http://x', summary: 'old' },
            { ...card, deepens: 'bfd' },
          ],
        })
      ).toEqual([
        'codex[0].summary: unknown field (expected one of: id, term, simple, deep, deepens, sources, docs, tryIt)',
        'codex[0].id: expected a kebab-case id like recover-from-failure, got "Card"',
        'codex[0].sources[0]: expected a path in FRR’s source tree like zebra/zebra_rib.c, got "/abs path"',
        'codex[0].docs: expected an https:// link, got "http://x"',
        'codex[1].deepens: a card cannot deepen itself',
      ])
    })

    it('points the story at sections of story.md, the scene, debrief and real world always', () => {
      expect(
        errorsWith({ story: { scene: 'story.md#scene', debrief: 'debrief.md', seeit: 'story.md#see-it' } })
      ).toEqual([
        'story.seeit: unknown field (expected one of: scene, seeIt, buildIt, watchIt, debrief, realWorld)',
        'story.debrief: expected a story section like story.md#scene, got "debrief.md"',
        'story.realWorld: expected non-empty text, got nothing',
      ])
    })

    it('keeps minutes between 1 and 120', () => {
      expect(errorsWith({ minutes: 0 })).toEqual(['minutes: expected a number from 1 to 120, got 0'])
    })
  })

  describe('objectives', () => {
    it('needs at least one, with ids that differ', () => {
      expect(errorsWith({ objectives: [] })).toEqual(['objectives: expected at least one objective'])
      expect(errorsWith({ objectives: [REACHES, REACHES] })).toEqual(['objectives: "reaches-c" appears more than once'])
    })

    it('carries no hints of its own: the mission has them', () => {
      expect(errorsWith({ objectives: [{ ...RECOVERS, hints: YAML.hints }] })).toEqual([
        'objectives[0].hints: unknown field (expected one of: id, text, check)',
      ])
    })

    it('reads each kind of check with its own fields', () => {
      const withCheck = (check: unknown) => validateMission({ ...YAML, objectives: [{ ...REACHES, check }] })
      const read = (check: unknown) => {
        const result = withCheck(check)
        return result.ok ? result.value.objectives[0]?.check : result.errors
      }
      expect(read({ kind: 'reachable' })).toEqual({ kind: 'reachable', minReplies: 1 })
      expect(read({ kind: 'path', before: 'a-c', after: 'a-b' })).toEqual({ kind: 'path', before: 'a-c', after: 'a-b' })
      expect(read({ kind: 'recovery', via: 'a-b', withinMs: 1500 })).toEqual({
        kind: 'recovery',
        via: 'a-b',
        withinMs: 1500,
      })
      expect(read({ kind: 'outage' })).toEqual({ kind: 'outage' })
      expect(read({ kind: 'outage', maxMs: 900 })).toEqual({ kind: 'outage', maxMs: 900 })
      expect(read({ kind: 'detected-by', event: 'bfd_session_down' })).toEqual({
        kind: 'detected-by',
        event: 'bfd_session_down',
      })
    })

    it("reports a check's problems under the objective's path", () => {
      const errors = errorsWith({
        objectives: [
          { ...REACHES, check: { kind: 'typed', command: 'ip ospf bfd' } },
          { ...DIRECT, check: { kind: 'path' } },
          { ...RECOVERS, check: { kind: 'recovery', via: 'a-b', withinMs: 0, within: 2000 } },
          { ...REACHES, id: 'detected', check: { kind: 'detected-by', event: 'ospf_hello' } },
        ],
      })
      expect(errors).toEqual([
        'objectives[0].check.kind: expected one of reachable, path, recovery, outage, detected-by, daemons, route, reaches, config, got "typed"',
        'objectives[1].check: expected "before", "after" or both: the interface traffic must leave through',
        'objectives[2].check.within: unknown field (expected one of: kind, via, withinMs)',
        'objectives[2].check.withinMs: expected a number from 1 to 9007199254740991, got 0',
        'objectives[3].check.event: expected one of bfd_session_down, ospf_dead_timer_expired, got "ospf_hello"',
      ])
    })

    it("only lets a check name an interface of the probe's router", () => {
      expect(errorsWith({ objectives: [{ ...DIRECT, check: { kind: 'path', before: 'c-a', after: 'a-z' } }] })).toEqual(
        [
          'objectives[0].check.before: "c-a" is not an interface of router "a", where the probe starts (expected one of: a-b, a-c)',
          'objectives[0].check.after: "a-z" is not an interface of router "a", where the probe starts (expected one of: a-b, a-c)',
        ]
      )
    })
  })

  describe('a mission without a fault', () => {
    const STATE = STATE_MISSION_YAML
    const [FRR_RUNS, ROUTE_OUT] = STATE.objectives
    const stateErrors = (fields: Readonly<Record<string, unknown>>): readonly string[] => {
      const result = validateMission({ ...STATE, ...fields })
      return result.ok ? [] : result.errors
    }

    it('needs no fault, probe or recovery target, and reads the state checks with their defaults', () => {
      const result = validateMission(STATE)
      expect(result.ok ? [] : result.errors).toEqual([])
      const mission = result.ok ? result.value : null
      expect(mission).not.toHaveProperty('fault')
      expect(mission).not.toHaveProperty('probe')
      expect(mission).not.toHaveProperty('recoveryTargetMs')
      expect(mission?.restartOnCheck).toEqual(['a'])
      expect(mission?.network.routers[0]?.startup).toBe('watchfrr')
      expect(mission?.objectives.map((objective) => objective.check)).toEqual([
        { kind: 'daemons', router: 'a', daemons: ['watchfrr', 'zebra', 'mgmtd', 'staticd'] },
        { kind: 'route', router: 'a', to: '10.0.2.2', protocol: 'static', interface: 'a-b' },
        { kind: 'route', router: 'c', prefix: '10.0.1.0/30', protocol: 'static' },
        { kind: 'reaches', from: 'a', to: '10.0.2.2', minReplies: 2 },
        { kind: 'config', router: 'a', source: 'saved', block: [], line: 'ip route 10.0.2.0/30' },
      ])
    })

    it('may still send a probe, and leave a link’s end for the player to address', () => {
      const [ab, bc] = STATE.network.links
      const [a, b] = ab.ends
      expect(
        stateErrors({
          probe: { id: 'a-to-c', from: 'a', source: '10.0.1.1', destination: '10.0.2.2', intervalMs: 200 },
          network: { ...STATE.network, links: [{ ends: [{ ...a, unaddressed: true }, b] }, bc] },
        })
      ).toEqual([])
    })

    it('asks for the probe, the fault and the target a run check reads', () => {
      const { restartOnCheck: _, ...unrestarted } = STATE
      const runChecks = validateMission({
        ...unrestarted,
        objectives: [
          { ...FRR_RUNS, check: { kind: 'reachable' } },
          { ...ROUTE_OUT, check: { kind: 'recovery', via: 'a-b' } },
        ],
      })
      expect(runChecks.ok ? [] : runChecks.errors).toEqual([
        'objectives[0].check: a "reachable" check reads the mission\'s probe: add "probe"',
        'objectives[1].check: a "recovery" check reads the mission\'s probe: add "probe"',
        'objectives[1].check: a "recovery" check reads what happens after the fault: add "fault"',
        'objectives[1].check: a "recovery" check with no limit of its own needs "recoveryTargetMs"',
      ])
      const { probe: __, ...unprobed } = YAML
      expect(validateMission(unprobed)).toMatchObject({
        ok: false,
        errors: expect.arrayContaining(['fault: a fault is measured with a probe: add "probe"']),
      })
      expect(stateErrors({ recoveryTargetMs: 2000 })).toEqual([
        'recoveryTargetMs: only a mission with a fault has a recovery target',
      ])
    })

    it('reports a state check’s fields', () => {
      const withChecks = (...checks: unknown[]) =>
        stateErrors({ objectives: checks.map((check, at) => ({ ...FRR_RUNS, id: `check-${at}`, check })) })
      expect(
        withChecks(
          { kind: 'daemons', router: 'a', daemons: ['zebra', 'ripd'] },
          { kind: 'daemons', router: 'a', daemons: [] },
          { kind: 'route', router: 'a' },
          { kind: 'route', router: 'a', prefix: '10.0.2.0/30', to: '10.0.2.2' },
          { kind: 'route', router: 'a', to: '10.0.2.0/30', protocol: 'Static', via: 'b' },
          { kind: 'reaches', from: 'a', to: 'c', minReplies: 4 },
          { kind: 'config', router: 'a', source: 'startup', block: 'interface lo', line: '' }
        )
      ).toEqual([
        'objectives[0].check.daemons[1]: expected one of watchfrr, zebra, mgmtd, staticd, ospfd, ospf6d, isisd, bgpd, bfdd, got "ripd"',
        'objectives[1].check.daemons: expected at least one daemon',
        'objectives[2].check: expected "prefix" (that exact route) or "to" (the route an address would use), not both',
        'objectives[3].check: expected "prefix" (that exact route) or "to" (the route an address would use), not both',
        'objectives[4].check.to: expected an address like 10.0.1.2, got "10.0.2.0/30"',
        'objectives[4].check.protocol: expected a protocol as ip route names it, like static, got "Static"',
        'objectives[4].check.via: expected an address like 10.0.1.2, got "b"',
        'objectives[5].check.to: expected an address like 10.0.1.2, got "c"',
        'objectives[5].check.minReplies: expected a number from 1 to 3, got 4',
        'objectives[6].check.source: expected one of running, saved, started, got "startup"',
        'objectives[6].check.block: expected a list, got text',
        'objectives[6].check.line: expected non-empty text, got empty text',
      ])
    })

    it('reads a config check’s absent flag, kept only when true', () => {
      const line = { kind: 'config', router: 'a', source: 'started', block: ['interface a-b'], line: 'shutdown' }
      const checkOf = (fields: Readonly<Record<string, unknown>>) => {
        const result = validateMission({ ...STATE, objectives: [{ ...FRR_RUNS, check: { ...line, ...fields } }] })
        return result.ok ? result.value.objectives[0]?.check : result.errors
      }
      expect(checkOf({ absent: true })).toEqual({ ...line, absent: true })
      expect(checkOf({ absent: false })).toEqual(line)
      expect(checkOf({ absent: 'yes' })).toEqual(['objectives[0].check.absent: expected true or false, got text'])
    })

    it('only lets a state check name a router of the network, and an interface of that router', () => {
      expect(
        stateErrors({
          objectives: [
            { ...FRR_RUNS, check: { kind: 'daemons', router: 'z', daemons: ['zebra'] } },
            { ...ROUTE_OUT, check: { kind: 'route', router: 'a', to: '10.0.2.2', interface: 'c-b' } },
            { ...ROUTE_OUT, id: 'own', check: { kind: 'route', router: 'a', to: '10.255.0.1', interface: 'lo' } },
            { ...ROUTE_OUT, id: 'ping', check: { kind: 'reaches', from: 'd', to: '10.0.2.2' } },
          ],
        })
      ).toEqual([
        'objectives[0].check.router: no router named "z"',
        'objectives[1].check.interface: "c-b" is not an interface of router "a" (expected one of: a-b, lo)',
        'objectives[3].check.from: no router named "d"',
      ])
    })

    it('only restarts a router that FRR’s init script started, and only before a state check', () => {
      expect(stateErrors({ restartOnCheck: ['b', 'z', 'a', 'a'] })).toEqual([
        'restartOnCheck: "a" appears more than once',
      ])
      expect(stateErrors({ restartOnCheck: ['b', 'z'] })).toEqual([
        'restartOnCheck[0]: router "b" is restarted by FRR\'s init script: give it "startup: watchfrr"',
        'restartOnCheck[1]: no router named "z"',
      ])
      expect(errorsWith({ restartOnCheck: [] })).toEqual([
        'restartOnCheck: nothing is checked after the restart: add a check that reads the Machine’s state',
      ])
    })

    it('reports a startup the Machine does not know', () => {
      const [a, b, c] = STATE.network.routers
      expect(stateErrors({ network: { ...STATE.network, routers: [{ ...a, startup: 'systemd' }, b, c] } })).toEqual([
        'network.routers[0].startup: expected one of direct, watchfrr, none, got "systemd"',
      ])
    })
  })

  it('reports a mission that requires itself or the same mission twice', () => {
    expect(errorsWith({ prerequisites: [YAML.id] })).toEqual(['prerequisites: a mission cannot require itself'])
    expect(errorsWith({ prerequisites: ['first-contact', 'first-contact'] })).toEqual([
      'prerequisites: "first-contact" appears more than once',
    ])
  })
})

describe('validateChapters', () => {
  it('numbers the stages in the order of the file', () => {
    expect(validateChapters(EXAMPLE_CHAPTERS_YAML)).toMatchObject({
      ok: true,
      value: [
        { id: 'recover-from-failure', stage: 1, title: 'Recover from failure' },
        { id: 'scale-with-bgp', stage: 2 },
      ],
    })
  })

  it('reports every problem with its path', () => {
    const [first] = EXAMPLE_CHAPTERS_YAML.chapters
    expect(validateChapters({ chapters: [first, { ...first, summary: '', stage: 4 }], version: 1 })).toEqual({
      ok: false,
      errors: [
        'version: unknown field (expected one of: chapters)',
        'chapters[1].stage: unknown field (expected one of: id, title, summary, story, guide, standsFor, outcomes)',
        'chapters[1].summary: expected non-empty text, got empty text',
        'chapters: "recover-from-failure" appears more than once',
      ],
    })
    expect(validateChapters({ chapters: [] })).toEqual({
      ok: false,
      errors: ['chapters: expected at least one chapter'],
    })
    expect(validateChapters([])).toMatchObject({ ok: false })
  })
})
