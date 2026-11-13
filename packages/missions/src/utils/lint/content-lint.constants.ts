import type { MissionId } from '@peerfall/game/types'
import type { VocabularyRule } from '#types/definitions/lint'

/** The guided steps of a story and their word budgets; the real-world card has none. */
export const STEP_WORD_BUDGETS: Readonly<Record<string, number>> = {
  scene: 80,
  'see-it': 200,
  'build-it': 150,
  'watch-it': 120,
  debrief: 50,
}

export const STORY_WORD_BUDGET = { min: 500, max: 650 } as const

export const CODEX_WORD_BUDGETS = { simple: 25, deep: 80 } as const

export const ASIDE_BUDGET = 0

// What happens off the network, and hedges: matched case-insensitively, as whole words. The
// Machine is real Linux running real FRR, so a story never calls it a simulation.
export const BANNED_PHRASES: readonly string[] = [
  'the game',
  'this game',
  'emulator',
  'emulated',
  'simulated',
  'simulation',
  'the VM',
  'your numbers will differ',
  'your numbers may differ',
  'yours will differ',
  'next release',
]

// One meaning per word, from docs/GAME.md's vocabulary: each rule flags the words a story must
// not use for that thing. Only what a pattern can tell apart is here; "route" against "path" or
// "the network" meaning every router needs a reader.
export const VOCABULARY: readonly VocabularyRule[] = [
  {
    word: 'the Machine',
    means: 'the one Linux computer every router runs in, always with a capital M',
    pattern: /\bthe machine\b/,
  },
  {
    word: 'router',
    means: 'one of the network’s routers, never a node, box, device or host',
    pattern: /\b(nodes?|box(es)?|devices?|hosts?)\b/i,
    // A host route is FRR's and the kernel's own name for a route to one address.
    allowed: /\bhost routes?\b/gi,
  },
  {
    word: 'interface',
    means: 'a router’s end of a link, never a port or a card',
    pattern: /\b(ports?|network cards?|NICs?)\b/i,
  },
  {
    word: 'link',
    means: 'the cable between two interfaces, never a connection or a circuit',
    pattern: /\b(connections?|circuits?)\b/i,
  },
  {
    word: 'peer',
    means: 'a router a routing protocol talks to, from stage 3; before it, a neighbour',
    pattern: /\bpeers?\b/i,
    // The story's frame: the opening, where every router has lost its peers, and stage 2's
    // hand-off to stage 3, where they come back.
    only: ['the-dark-cable', 'bring-the-line-up', 'the-link-that-never-went-down'],
  },
  {
    // "Message" is left out: a log line is a message, in FRR's words and in the stories.
    word: 'packet',
    means: 'one piece of data with a source and a destination, never a frame unless it is a link-layer frame',
    pattern: /\bframes?\b/i,
    allowed: /\blink-layer frames?\b/gi,
  },
  {
    word: 'daemon',
    means: 'one FRR program with one job, never a service or an agent',
    pattern: /\b(services?|agents?)\b/i,
    // Linux's service manager starts FRR on an installed router: that one is Linux's word.
    allowed: /\bservice manager\b/gi,
  },
  {
    word: 'running configuration',
    means: 'what the daemons do now; never "the config" said alone',
    pattern: /\bthe config\b/i,
  },
  {
    word: 'saved configuration',
    means: 'the file frr.conf; never startup-config, which prints nothing on the Machine',
    pattern: /\bstartup[- ]config\b/i,
  },
  {
    word: 'restart',
    means: 'FRR stopped and started again on a router, never the Machine restarted',
    pattern: /\b(restart|reboot)(s|ed|ing)? the Machine\b/i,
  },
  {
    word: 'stage',
    means: 'one part of the journey; never a level, an act or a chapter',
    pattern: /\b(levels?|acts?|chapters?)\b/i,
  },
  {
    word: 'mission',
    means: 'one stop of a stage; never a lesson',
    pattern: /\blessons?\b/i,
  },
]

// Rewritten to the standard: their budgets fail the tests; the others only warn.
export const ENFORCED_MISSIONS: readonly MissionId[] = [
  'the-dark-cable',
  'nobody-answers',
  'the-silent-router',
  'the-routers-language',
  'what-it-does-now',
  'gone-after-the-restart',
  'the-skipped-line',
  'a-router-from-nothing',
  'two-ends-of-one-cable',
  'one-hop-further',
  'the-reply-that-never-came-back',
  'written-but-not-used',
  'the-backup-path',
  'bring-the-line-up',
  'the-link-that-never-went-down',
]
