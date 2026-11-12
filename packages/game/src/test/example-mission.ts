import type { GameContent } from '#types/definitions/content'
import type { ChapterDefinition, MissionDefinition } from '#types/definitions/mission'
import { createGameContent } from '#utils/content/index'
import { validateChapters, validateMission } from '#utils/validate/index'

const ROUTERS = ['a', 'b', 'c'] as const

function router(name: string, id: number) {
  const interfaces = ROUTERS.filter((peer) => peer !== name)
    .map((peer) => `interface ${name}-${peer}\n ip ospf area 0\n ip ospf network point-to-point\n ip ospf cost 10\n!\n`)
    .join('')
  return {
    name,
    loopback: `10.255.0.${id}/32`,
    daemons: ['ospfd', 'bfdd'],
    config: `${interfaces}interface lo\n ip ospf area 0\n ip ospf passive\n!\nrouter ospf\n ospf router-id 10.255.0.${id}\n log-adjacency-changes detail\n`,
  }
}

const link = (first: string, second: string, subnet: number) => ({
  ends: [
    { router: first, address: `10.0.${subnet}.1/30` },
    { router: second, address: `10.0.${subnet}.2/30` },
  ],
})

/**
 * A parsed `mission.yaml` that uses every field of the schema: three routers in a triangle, OSPF
 * on every link at the same cost, so a reaches c directly or through b; the direct link breaks.
 */
export const EXAMPLE_MISSION_YAML = {
  id: 'the-link-that-never-went-down',
  version: 1,
  title: 'The Link That Never Went Down',
  chapter: 'recover-from-failure',
  objective: 'When the link between a and c stops passing packets, traffic is back through b within two seconds.',
  prerequisites: [],
  network: {
    routers: ROUTERS.map((name, at) => router(name, at + 1)),
    links: [link('a', 'b', 1), link('a', 'c', 2), link('b', 'c', 3)],
  },
  fault: { link: ['a', 'c'] },
  probe: { id: 'a-to-c', from: 'a', source: '10.255.0.1', destination: '10.255.0.3', intervalMs: 50 },
  recoveryTargetMs: 2000,
  objectives: [
    {
      id: 'reaches-c',
      text: 'Router a reaches c while the network is healthy.',
      check: { kind: 'reachable', minReplies: 3 },
      hints: [
        { text: 'The probe at the top shows whether replies are coming back.' },
        { text: 'Ask a for its route to c.', command: 'show ip route 10.255.0.3' },
      ],
    },
    {
      id: 'direct-while-healthy',
      text: 'While the network is healthy, traffic to c takes the direct link.',
      check: { kind: 'path', before: 'a-c' },
      hints: [
        { text: 'Look at which interface the route to c leaves through.' },
        { text: 'Both paths cost the same per link; the direct one has fewer links.', command: 'show ip ospf route' },
      ],
    },
    {
      id: 'recovers-through-b',
      text: 'After the fault, replies come back through b in under two seconds.',
      check: { kind: 'recovery', via: 'a-b' },
      hints: [
        { text: 'Watch how long a keeps its neighbor c after the link breaks.' },
        { text: 'Something has to notice a dead neighbor faster than the OSPF dead timer.' },
        { text: 'Turn on BFD for OSPF on both ends of the link.', command: 'ip ospf bfd' },
      ],
    },
  ],
} as const

/** The example `mission.yaml` with `fields` changed; throws if it doesn't validate. */
export function exampleMission(fields: Readonly<Record<string, unknown>> = {}): MissionDefinition {
  const result = validateMission({ ...EXAMPLE_MISSION_YAML, ...fields })
  if (!result.ok) {
    throw new Error(result.errors.join('\n'))
  }
  return result.value
}

export const EXAMPLE_MISSION: MissionDefinition = exampleMission()

/** A second mission that needs the first one, for unlock and status tests. */
export const FOLLOW_UP_MISSION: MissionDefinition = exampleMission({
  id: 'faster-than-default',
  title: 'Faster Than Default',
  prerequisites: [EXAMPLE_MISSION.id],
})

/** A parsed `chapters.yaml`: one stage with missions and one still to come. */
export const EXAMPLE_CHAPTERS_YAML = {
  chapters: [
    {
      id: 'recover-from-failure',
      title: 'Recover from failure',
      summary: 'Notice a dead neighbor quickly and move traffic to another path.',
    },
    { id: 'scale-with-bgp', title: 'Scale with BGP', summary: 'Carry routes between networks.' },
  ],
} as const

export function exampleChapters(): readonly ChapterDefinition[] {
  const result = validateChapters(EXAMPLE_CHAPTERS_YAML)
  if (!result.ok) {
    throw new Error(result.errors.join('\n'))
  }
  return result.value
}

/** Content built from `missions` with the example chapters; throws if it doesn't validate. */
export function contentOf(missions: readonly MissionDefinition[]): GameContent {
  const content = createGameContent({ chapters: exampleChapters(), missions })
  if (!content.ok) {
    throw new Error(content.errors.join('\n'))
  }
  return content.value
}

/** The example mission, then the one it unlocks. */
export const exampleContent = (): GameContent => contentOf([EXAMPLE_MISSION, FOLLOW_UP_MISSION])
