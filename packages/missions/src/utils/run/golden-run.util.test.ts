import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { parse } from 'yaml'
import { changeLines, validateSolution } from '#utils/run/golden-run.util'

const CONTENT = join(dirname(fileURLToPath(import.meta.url)), '../../../content')

const RUNS = [
  { id: 'start', passes: false, changes: [] },
  { id: 'half-done', passes: false, changes: [{ router: 'a', lines: ['configure terminal', 'interface lo'] }] },
  {
    id: 'reference',
    passes: true,
    changes: [
      { router: 'a', shell: ['/usr/lib/frr/frrinit.sh start a'] },
      { router: 'a', lines: ['configure terminal', 'interface lo', 'description loopback', 'end', 'write memory'] },
      { router: 'a', restart: true },
    ],
  },
]

describe('validateSolution', () => {
  it('reads the three kinds of change', () => {
    expect(validateSolution({ runs: RUNS })).toEqual({ ok: true, value: RUNS })
  })

  it('reads a vtysh change marked as refused, and only a vtysh change', () => {
    const refused = { router: 'a', lines: ['configure terminal', 'no shutdown'], refused: true }
    const result = validateSolution({ runs: [...RUNS, { id: 'wrong-mode', passes: false, changes: [refused] }] })
    expect(result.ok ? result.value.at(-1)?.changes : result.errors).toEqual([refused])
    const errors = validateSolution({
      runs: [
        ...RUNS,
        {
          id: 'wrong',
          passes: false,
          changes: [
            { ...refused, refused: false },
            { router: 'a', shell: ['ls'], refused: true },
          ],
        },
      ],
    })
    expect(errors.ok ? [] : errors.errors).toEqual([
      'runs[3].changes[0].refused: expected true: leave it out when FRR accepts every line',
      'runs[3].changes[1].refused: only a "lines" change can be refused: vtysh is what refuses',
    ])
  })

  it('wants the mission as it starts, a wrong solution and the reference', () => {
    const [start, wrong, reference] = RUNS
    const errors = (runs: unknown) => {
      const result = validateSolution({ runs })
      return result.ok ? [] : result.errors
    }
    expect(errors([start, wrong])).toEqual(['runs: expected a run that passes: the reference solution'])
    expect(errors([wrong, reference])).toEqual([
      'runs: expected a run with no changes that does not pass: the mission as it starts',
    ])
    expect(errors([start, reference])).toEqual([
      'runs: expected a run that changes something and does not pass: a wrong or half-done solution',
    ])
  })

  it('reports every problem with its path', () => {
    const result = validateSolution({
      runs: [
        { id: 'Start', passes: 'no', changes: [] },
        {
          id: 'reference',
          passes: true,
          changes: [
            { router: 'a', lines: ['show'], shell: ['ls'] },
            { router: 'a', restart: false },
            { router: 'a', shell: ["echo 'quoted'"] },
            { router: 'a', vtysh: ['show'] },
          ],
        },
        { id: 'reference', passes: false, changes: [] },
      ],
    })
    expect(result).toEqual({
      ok: false,
      errors: [
        'runs[0].passes: expected true or false',
        'runs[0].id: expected a kebab-case id like bfd-both-ends, got "Start"',
        'runs[1].changes[0]: expected one of "lines" (vtysh), "shell" or "restart: true"',
        'runs[1].changes[1].restart: expected true',
        "runs[1].changes[2].shell[0]: expected a line without a single quote ('), got \"echo 'quoted'\"",
        'runs[1].changes[3].vtysh: unknown field (expected one of: router, lines, shell, restart, refused)',
        'runs[1].changes[3]: expected one of "lines" (vtysh), "shell" or "restart: true"',
        'runs: "reference" appears more than once',
      ],
    })
  })
})

describe('changeLines', () => {
  it('types vtysh lines into the router’s vtysh in one go', () => {
    expect(changeLines({ router: 'a', lines: ['configure terminal', 'interface a-c', 'ip ospf bfd'] })).toEqual([
      "vtysh -N a -c 'configure terminal' -c 'interface a-c' -c 'ip ospf bfd'",
    ])
    expect(changeLines({ router: 'a', lines: [] })).toEqual([])
  })

  it('runs each shell line in the router: its namespace and its hostname', () => {
    expect(changeLines({ router: 'a', shell: ['/usr/lib/frr/frrinit.sh start a'] })).toEqual([
      "ip netns exec a unshare -u sh -c 'hostname a && exec /usr/lib/frr/frrinit.sh start a'",
    ])
  })

  it('restarts FRR with its own init script', () => {
    expect(changeLines({ router: 'a', restart: true })).toEqual([
      "ip netns exec a unshare -u sh -c 'hostname a && exec /usr/lib/frr/frrinit.sh restart a'",
    ])
  })
})

describe('the repository’s solutions', () => {
  const folders = readdirSync(CONTENT, { withFileTypes: true })
    .filter((chapter) => chapter.isDirectory())
    .flatMap((chapter) =>
      readdirSync(join(CONTENT, chapter.name), { withFileTypes: true })
        .filter((mission) => mission.isDirectory())
        .map((mission) => `${chapter.name}/${mission.name}`)
    )

  it.each(folders)('%s/solution.yaml is valid', (folder) => {
    const result = validateSolution(parse(readFileSync(join(CONTENT, folder, 'solution.yaml'), 'utf8')))
    expect(result.ok ? [] : result.errors).toEqual([])
  })
})
