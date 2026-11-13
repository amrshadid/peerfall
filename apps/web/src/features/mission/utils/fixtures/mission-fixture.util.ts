import type { ChapterDefinition, MissionDefinition } from '@peerfall/game/types'
import type { LoadedContent, Story } from '@peerfall/missions/types'
import { TRIANGLE } from '@/test/fixtures/network.fixture'
import { STORY } from '@/test/fixtures/story.fixture'

// Made up to test the mission's screens without the content on disk, which changes as missions are
// written: the shape is the first mission's, the text is cut short. Only tests import this.

export const CHAPTER_FIXTURE: ChapterDefinition = {
  id: 'recover-from-failure',
  stage: 4,
  title: 'Recover from failure',
  summary: 'Notice a dead path in under a second.',
  outcomes: [],
}

export const MISSION_FIXTURE: MissionDefinition = {
  id: 'the-link-that-never-went-down',
  version: 1,
  title: 'The Link That Never Went Down',
  chapter: CHAPTER_FIXTURE.id,
  objective: 'When the link between a and c stops passing packets, traffic is back through b in under two seconds.',
  prerequisites: [],
  teaches: [],
  names: [],
  uses: [],
  chips: [
    { command: 'show ip ospf neighbor', explain: 'Who `a` is an OSPF neighbor of, and the dead time left on each.' },
  ],
  codex: [
    {
      id: 'bfd',
      term: 'BFD',
      simple: 'A tiny protocol whose only job is to notice that a path to a neighbor is dead.',
      sources: ['bfdd/bfd.c'],
    },
  ],
  story: {
    scene: 'story.md#scene',
    seeIt: 'story.md#see-it',
    buildIt: 'story.md#build-it',
    debrief: 'story.md#debrief',
    realWorld: 'story.md#real-world',
  },
  hints: [
    { text: 'Run the fault once as it is and read the timeline.' },
    { text: 'BFD is a small protocol whose only job is to notice sooner.' },
    { text: "Turn BFD on for OSPF on a's interface to c, and on c's interface to a.", command: 'ip ospf bfd' },
  ],
  network: TRIANGLE,
  fault: { link: ['a', 'c'] },
  probe: { id: 'a-to-c', from: 'a', source: '10.255.0.1', destination: '10.255.0.3', intervalMs: 50 },
  recoveryTargetMs: 2000,
  objectives: [
    {
      id: 'reaches-c',
      text: 'Send a probe from a to c and see the replies come back.',
      check: { kind: 'reachable', minReplies: 3 },
    },
    {
      id: 'direct-while-healthy',
      text: "Find the way a's traffic takes to c while the network is healthy.",
      check: { kind: 'path', before: 'a-c' },
    },
    {
      id: 'recovers-through-b',
      text: 'Break the link and get traffic back through b in under two seconds.',
      check: { kind: 'recovery', via: 'a-b' },
    },
  ],
}

export const STORY_FIXTURE: Story = { title: MISSION_FIXTURE.title, question: null, sections: STORY }

/** The game's content with this one mission in it, as `useContent()` hands it to a container. */
export const CONTENT_FIXTURE: LoadedContent = {
  game: {
    chapters: [CHAPTER_FIXTURE],
    missions: [MISSION_FIXTURE],
    concepts: [],
    fieldGuide: { entries: [] },
    mission: (id) => (id === MISSION_FIXTURE.id ? MISSION_FIXTURE : undefined),
    missionsIn: (chapter) => (chapter === CHAPTER_FIXTURE.id ? [MISSION_FIXTURE] : []),
    numberOf: (id) => (id === MISSION_FIXTURE.id ? '4.1' : undefined),
    concept: () => undefined,
    card: (id) => {
      const card = MISSION_FIXTURE.codex.find((candidate) => candidate.id === id)
      return card ? { card, missionId: MISSION_FIXTURE.id } : undefined
    },
  },
  storyOf: (id) => (id === MISSION_FIXTURE.id ? STORY_FIXTURE : undefined),
  folderOf: (id) => (id === MISSION_FIXTURE.id ? '4-recover-from-failure/01-the-link-that-never-went-down' : undefined),
}
