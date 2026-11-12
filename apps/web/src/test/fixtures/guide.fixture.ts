import type { GuideHint, GuideIncident, GuideObjective } from '@features/guide/types'

// Made up to lay screens out and test them: mission text comes from the missions package, checked on the Machine.

export const INCIDENT: GuideIncident = {
  title: 'The Link That Never Went Down',
  source: 'Filed by the network operations desk',
  body: [
    'Traffic from `a` to `c` stopped for most of a minute. Every interface on both routers stayed **up** the whole time.',
    'The link between them was losing every packet. Nothing told the routers, so they kept sending into it.',
  ],
}

export const TASK: readonly string[] = [
  'Look at how `a` reaches `10.255.0.3` before anything breaks, and how it learns that a neighbor is gone.',
]

export const OBJECTIVES: readonly GuideObjective[] = [
  { id: 'direct', text: 'Before the fault, `a` reaches `c` over the direct link.', passed: true },
  {
    id: 'recovery',
    text: 'After the fault, traffic is back in under 2 seconds.',
    passed: false,
    observed: 'traffic was lost for 37.8 s',
  },
  { id: 'detour', text: 'After the fault, `a` reaches `c` through `b`.', passed: false },
]

export const HINTS: readonly GuideHint[] = [
  { stage: 'where to look', text: 'Ask `a` how long it waits before it gives up on a silent neighbor.' },
  { stage: 'the idea', text: 'A protocol whose only job is to notice a dead path can do it in under a second.' },
  { stage: 'the command', text: 'On both ends of the link, under `interface a-c`: `ip ospf bfd`.' },
]

export const COMMANDS = [
  { command: 'show ip ospf neighbor', explain: 'Who `a` has an adjacency with, and the dead time left on each.' },
  { command: 'show ip route 10.255.0.3', explain: 'The route `a` uses to reach `c`, and its next hop.' },
] as const
