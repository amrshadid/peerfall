import { describe, expect, it } from 'vitest'
import { EXAMPLE_CHAPTERS_YAML, EXAMPLE_MISSION_YAML } from '#test/index'
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
      'dificulty: unknown field (expected one of: id, version, title, chapter, objective, prerequisites, network, fault, probe, recoveryTargetMs, objectives)',
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

  describe('objectives', () => {
    it('needs at least one, with ids that differ', () => {
      expect(errorsWith({ objectives: [] })).toEqual(['objectives: expected at least one objective'])
      expect(errorsWith({ objectives: [REACHES, REACHES] })).toEqual(['objectives: "reaches-c" appears more than once'])
    })

    it('stages hints: at least two, the last one naming a command', () => {
      const [where, command] = RECOVERS.hints
      expect(errorsWith({ objectives: [{ ...RECOVERS, hints: [command] }] })).toEqual([
        'objectives[0].hints: expected at least 2 hints, from where to look to a specific command',
      ])
      expect(errorsWith({ objectives: [{ ...RECOVERS, hints: [where, command] }] })).toEqual([
        'objectives[0].hints[1].command: the last hint names a specific command',
      ])
      expect(
        errorsWith({ objectives: [{ ...RECOVERS, hints: [{ text: 'Look.', comand: 'show' }, where] }] })
      ).toContain('objectives[0].hints[0].comand: unknown field (expected one of: text, command)')
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
        'objectives[0].check.kind: expected one of reachable, path, recovery, outage, detected-by, got "typed"',
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
        'chapters[1].stage: unknown field (expected one of: id, title, summary)',
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
