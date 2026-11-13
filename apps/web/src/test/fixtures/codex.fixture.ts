import type { ChapterDefinition, CodexCard, CodexChapter, CodexView, FieldGuideEntry } from '@peerfall/game/types'

// Made up to lay the Codex out and test it: cards come from the missions, their sources checked
// against FRR's tree at the release the Machine runs.

const FIRST_ROUTER: ChapterDefinition = {
  id: 'first-router',
  stage: 1,
  title: 'First router',
  summary: 'Meet one router and FRR on it.',
  story: 'One router blinks in the dark. Bring FRR up on it, and make it keep what you tell it.',
  guide: 'zebra',
  standsFor: 'zebra, vtysh and the daemons watchfrr starts',
  outcomes: ['Start FRR the way it is started on a real router.', 'Save a change so it survives a restart.'],
}

const FOLLOW_A_PACKET: ChapterDefinition = {
  id: 'follow-a-packet',
  stage: 2,
  title: 'Follow a packet',
  summary: 'Addresses, routes and the way back.',
  outcomes: ['Read a routing table.'],
}

const VTYSH: CodexCard = {
  id: 'vtysh',
  term: 'vtysh',
  simple: "FRR's shell: one prompt that talks to every daemon on the router.",
  deep: 'vtysh connects to each daemon over its socket in `/var/run/frr` and sends it the command.',
  sources: ['vtysh/vtysh.c'],
  docs: 'https://docs.frrouting.org/en/latest/vtysh.html',
  tryIt: 'vtysh -c "show version"',
}

const WATCHFRR: CodexCard = {
  id: 'watchfrr',
  term: 'watchfrr',
  simple: 'The watchdog that starts the daemons and starts one again when it dies.',
  sources: ['watchfrr/watchfrr.c'],
}

const RUNNING_CONFIG: CodexCard = {
  id: 'running-config',
  term: 'running configuration',
  simple: 'What the daemons are doing now, lost on a restart unless it is written.',
  deepens: 'vtysh',
  sources: [],
}

const RIB: CodexCard = { id: 'the-rib', term: 'the RIB', simple: "zebra's table of every route it knows.", sources: [] }

export const FIRST_CHAPTER: CodexChapter = {
  chapter: FIRST_ROUTER,
  filed: 2,
  total: 3,
  finished: false,
  youCanNow: [],
  cards: [
    {
      card: VTYSH,
      missionId: 'meet-frr',
      missionNumber: '1.2',
      state: 'filed',
      deepens: null,
      deepenedBy: [{ cardId: 'running-config', term: 'running configuration', missionNumber: '1.5', state: 'hidden' }],
    },
    {
      card: WATCHFRR,
      missionId: 'the-silent-router',
      missionNumber: '1.3',
      state: 'filed',
      deepens: null,
      deepenedBy: [],
    },
    {
      card: RUNNING_CONFIG,
      missionId: 'change-one-thing',
      missionNumber: '1.5',
      state: 'hidden',
      deepens: { cardId: 'vtysh', term: 'vtysh', missionNumber: '1.2', state: 'filed' },
      deepenedBy: [],
    },
  ],
}

export const SECOND_CHAPTER: CodexChapter = {
  chapter: FOLLOW_A_PACKET,
  filed: 0,
  total: 1,
  finished: false,
  youCanNow: [],
  cards: [{ card: RIB, missionId: 'rib-and-fib', missionNumber: '2.4', state: 'seen', deepens: null, deepenedBy: [] }],
}

export const CODEX: CodexView = {
  chapters: [FIRST_CHAPTER, SECOND_CHAPTER],
  glossary: [
    { term: 'vtysh', simple: VTYSH.simple, cardId: 'vtysh', missionNumber: '1.2' },
    { term: 'watchfrr', simple: WATCHFRR.simple, cardId: 'watchfrr', missionNumber: '1.3' },
  ],
  filed: 2,
  total: 4,
}

/** The first chapter with every mission done: all cards filed, its "You can now…" lines shown. */
export const FINISHED_CODEX: CodexView = {
  ...CODEX,
  chapters: [
    {
      ...FIRST_CHAPTER,
      filed: 3,
      finished: true,
      youCanNow: FIRST_ROUTER.outcomes,
      cards: FIRST_CHAPTER.cards.map((entry) => ({
        ...entry,
        state: 'filed',
        deepenedBy: entry.deepenedBy.map((link) => ({ ...link, state: 'filed' })),
      })),
    },
    SECOND_CHAPTER,
  ],
}

export const FIELD_GUIDE: readonly FieldGuideEntry[] = [
  { name: 'vtysh', kind: 'shell', what: "Opens FRR's shell on the router.", firstMet: 'meet-frr', deepenedIn: [] },
  {
    name: 'show running-config',
    kind: 'vtysh',
    what: 'Prints what the daemons are doing now.',
    firstMet: 'meet-frr',
    deepenedIn: ['change-one-thing'],
  },
]

/** "1.2 Meet FRR", as the Codex labels a mission. */
export const MISSION_LABELS: Readonly<Record<string, string>> = {
  'meet-frr': '1.2 Meet FRR',
  'the-silent-router': '1.3 The Silent Router',
  'change-one-thing': '1.5 Change One Thing',
  'rib-and-fib': '2.4 RIB and FIB',
}

export const missionLabel = (id: string): string => MISSION_LABELS[id] ?? id
