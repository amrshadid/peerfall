import type { GuideStory, GuideStoryBlock } from '@features/guide/types'

// Made up to lay the Guide out and test its pacing: mission stories come from the missions package,
// their output copied from a real run on the Machine.

const line = (speaker: string | null, text: string): GuideStoryBlock => ({ kind: 'line', speaker, text })
const PAUSE: GuideStoryBlock = { kind: 'pause' }

export const STORY_SCENE: readonly GuideStoryBlock[] = [
  line(null, 'The racks are quiet. One router, `a`, blinks in the dark.'),
  line('zebra', 'I am zebra. I keep every route this router knows, and I hand them to the Linux kernel.'),
  line('watchfrr', 'And nobody started me. Typical.'),
]

export const STORY_SEE: readonly GuideStoryBlock[] = [
  line('zebra', 'Ask the router what it knows. Type `vtysh`, then `show interface brief`.'),
  PAUSE,
  {
    kind: 'code',
    text: 'Interface       Status  VRF             Addresses\n---------       ------  ---             ---------\nlo              up      default',
  },
  line('zebra', 'That is me answering. `lo` is the loopback, the address the router keeps for itself.'),
  {
    kind: 'predict',
    speaker: 'zebra',
    text: 'If you ask for the routes now, what will I print?',
    options: [
      { text: 'Nothing at all', right: false },
      { text: 'Only the connected routes', right: true },
    ],
  },
  PAUSE,
  line('zebra', 'Only the connected ones: a router knows its own networks before it is told any other.'),
]

export const STORY_BUILD: readonly GuideStoryBlock[] = [
  line('zebra', 'Now give the router an address on `eth0`.'),
  {
    kind: 'predict',
    speaker: 'zebra',
    text: 'Which daemon will hold the address you type?',
    options: [
      { text: 'mgmtd, then zebra', right: true },
      { text: 'staticd', right: false },
    ],
  },
  line('zebra', 'mgmtd takes the configuration and hands the address to me.'),
]

export const STORY_DEBRIEF: readonly GuideStoryBlock[] = [
  line('zebra', 'You met FRR the way it runs on a real router.'),
]

export const STORY_REAL_WORLD: readonly GuideStoryBlock[] = [
  line(null, 'On a real router, `systemctl start frr` runs the same script.'),
]

export const STORY: GuideStory = new Map([
  ['scene', STORY_SCENE],
  ['see-it', STORY_SEE],
  ['build-it', STORY_BUILD],
  ['debrief', STORY_DEBRIEF],
  ['real-world', STORY_REAL_WORLD],
])
