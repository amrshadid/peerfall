import type { GameContent } from '#types/definitions/content'
import type { ChapterDefinition, MissionDefinition } from '#types/definitions/mission'
import type { SkillDefinition } from '#types/definitions/skills'
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
  skills: ['bfd-fast-detection'],
  prerequisites: [],
  summary: 'Make the network notice a dead link in under a second.',
  minutes: 20,
  teaches: ['bfd-session'],
  names: ['bfd-timers'],
  uses: ['ospf-adjacency'],
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
    },
    {
      id: 'direct-while-healthy',
      text: 'While the network is healthy, traffic to c takes the direct link.',
      check: { kind: 'path', before: 'a-c' },
    },
    {
      id: 'recovers-through-b',
      text: 'After the fault, replies come back through b in under two seconds.',
      check: { kind: 'recovery', via: 'a-b' },
    },
  ],
  hints: [
    { text: 'Watch how long a keeps its neighbor c after the link breaks.' },
    { text: 'Something has to notice a dead neighbor faster than the OSPF dead timer.' },
    { text: 'Turn on BFD for OSPF on both ends of the link.', command: 'ip ospf bfd' },
  ],
  chips: [{ command: 'show ip ospf neighbor', explain: "list a's OSPF neighbors and how long each has left" }],
  codex: [
    {
      id: 'bfd',
      term: 'BFD',
      simple: 'A fast hello between two neighbors that notices a dead link in under a second.',
      deep: 'bfdd sends a control packet every 300 ms and declares the session down after three are missed.',
      sources: ['bfdd/bfd.c'],
      docs: 'https://docs.frrouting.org/en/latest/bfd.html',
      tryIt: 'show bfd peers',
    },
  ],
  story: { scene: 'story.md#scene', debrief: 'story.md#debrief', realWorld: 'story.md#real-world' },
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

/** A second mission that needs the first one, for unlock and status tests; its card deepens the first's. */
export const FOLLOW_UP_MISSION: MissionDefinition = exampleMission({
  id: 'faster-than-default',
  title: 'Faster Than Default',
  skills: ['bfd-timers'],
  prerequisites: ['bfd-fast-detection'],
  teaches: ['bfd-timers'],
  names: [],
  uses: ['bfd-session'],
  codex: [
    {
      id: 'bfd-timers',
      term: 'BFD timers',
      simple: 'How often BFD sends, and how many missed packets end a session.',
      deepens: 'bfd',
      sources: ['bfdd/bfd.c'],
    },
  ],
})

const HINTS = [
  { text: 'Look at the router.' },
  { text: 'FRR keeps what it runs apart from what it saved.' },
  { text: 'Ask it.', command: 'show running-config' },
]

/**
 * A parsed `mission.yaml` with no fault and no probe, judged from the Machine's state alone:
 * three routers in a line, a's FRR started by watchfrr, and one check of every state kind.
 */
export const STATE_MISSION_YAML = {
  id: 'two-static-routes',
  version: 1,
  title: 'Two Static Routes',
  chapter: 'recover-from-failure',
  objective: 'Router a reaches c, and still does after a restart.',
  skills: ['static-routes-both-ways'],
  prerequisites: [],
  teaches: [],
  uses: [],
  network: {
    routers: [
      { name: 'a', daemons: ['staticd'], config: '', startup: 'watchfrr' },
      { name: 'b', daemons: ['staticd'], config: '' },
      { name: 'c', daemons: ['staticd'], config: '' },
    ],
    links: [link('a', 'b', 1), link('b', 'c', 2)],
  },
  restartOnCheck: ['a'],
  objectives: [
    {
      id: 'frr-runs',
      text: 'FRR runs on a.',
      check: { kind: 'daemons', router: 'a', daemons: ['watchfrr', 'zebra', 'mgmtd', 'staticd'] },
    },
    {
      id: 'route-out',
      text: 'a has a static route towards c.',
      check: { kind: 'route', router: 'a', to: '10.0.2.2', protocol: 'static', interface: 'a-b' },
    },
    {
      id: 'route-back',
      text: 'c has a static route back to a.',
      check: { kind: 'route', router: 'c', prefix: '10.0.1.0/30', protocol: 'static' },
    },
    {
      id: 'reaches-c',
      text: 'a reaches c.',
      check: { kind: 'reaches', from: 'a', to: '10.0.2.2' },
    },
    {
      id: 'saved',
      text: 'The route is in a’s saved configuration.',
      check: { kind: 'config', router: 'a', source: 'saved', line: 'ip route 10.0.2.0/30' },
    },
  ],
  hints: HINTS,
  story: { scene: 'story.md#scene', debrief: 'story.md#debrief', realWorld: 'story.md#real-world' },
} as const

/** The state mission with `fields` changed; throws if it doesn't validate. */
export function stateMission(fields: Readonly<Record<string, unknown>> = {}): MissionDefinition {
  const result = validateMission({ ...STATE_MISSION_YAML, ...fields })
  if (!result.ok) {
    throw new Error(result.errors.join('\n'))
  }
  return result.value
}

/** A parsed `chapters.yaml`: one stage with missions and one still to come. */
export const EXAMPLE_CHAPTERS_YAML = {
  chapters: [
    {
      id: 'recover-from-failure',
      title: 'Recover from failure',
      summary: 'Notice a dead neighbor quickly and move traffic to another path.',
      story: 'A link went quiet and nobody noticed for forty seconds.',
      guide: 'bfdd',
      standsFor: 'bfdd and the routing protocols it serves',
      outcomes: ['measure an outage', 'make OSPF notice a dead link in under a second'],
    },
    {
      id: 'scale-with-bgp',
      title: 'Scale with BGP',
      summary: 'Carry routes between networks.',
      story: 'Two networks need each other’s routes.',
      guide: 'bgpd',
      standsFor: 'bgpd',
      outcomes: ['bring up a BGP session'],
    },
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

/** The example missions' skills, in a region of their own. */
export const EXAMPLE_REGION = {
  id: 'notice-it-fast',
  name: 'Notice it fast',
  caption: 'measure an outage, then let BFD notice a dead link',
  guide: 'bfdd',
  source: 'bfdd/, ospfd/ospf_bfd.c',
  missions: ['the-link-that-never-went-down', 'faster-than-default'],
} as const

export const EXAMPLE_SKILLS: readonly SkillDefinition[] = [
  {
    id: 'bfd-fast-detection',
    title: 'Notice a dead link in under a second',
    region: EXAMPLE_REGION.id,
    prerequisites: [],
  },
  { id: 'bfd-timers', title: "Tune BFD's timers", region: EXAMPLE_REGION.id, prerequisites: ['bfd-fast-detection'] },
]

/** The example mission, then the one it unlocks. */
export const exampleContent = (): GameContent => contentOf([EXAMPLE_MISSION, FOLLOW_UP_MISSION])
