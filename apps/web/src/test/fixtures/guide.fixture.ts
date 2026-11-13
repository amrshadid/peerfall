import type { GuideHint, GuideObjective } from '@features/guide/types'

// Made up to lay screens out and test them: mission text comes from the missions package, checked on the Machine.

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

/** A mission's three hints, as the content gives them: a nudge, the concept, the spot. */
export const MISSION_HINTS = [
  { text: 'Ask `a` how long it waits before it gives up on a silent neighbor.' },
  { text: 'A protocol whose only job is to notice a dead path can do it in under a second.' },
  { text: 'On both ends of the link, under `interface a-c`:', command: 'ip ospf bfd' },
] as const

export const HINTS: readonly GuideHint[] = [
  { tier: 'a nudge', text: MISSION_HINTS[0].text, command: null },
  { tier: 'the concept', text: MISSION_HINTS[1].text, command: null },
  { tier: 'the spot', text: MISSION_HINTS[2].text, command: MISSION_HINTS[2].command },
]

export const COMMANDS = [
  { command: 'show ip ospf neighbor', explain: 'Who `a` has an adjacency with, and the dead time left on each.' },
  { command: 'show ip route 10.255.0.3', explain: 'The route `a` uses to reach `c`, and its next hop.' },
] as const
