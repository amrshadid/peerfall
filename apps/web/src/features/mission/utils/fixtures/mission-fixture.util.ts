import type { ChapterDefinition, MissionDefinition } from '@peerfall/game/types'
import type { LoadedContent } from '@peerfall/missions/types'
import { TRIANGLE } from '@/test/fixtures/network.fixture'

// Made up to test the mission's screens without the content on disk, which changes as missions are
// written: the shape is the first mission's, the text is cut short. Only tests import this.

export const CHAPTER_FIXTURE: ChapterDefinition = {
  id: 'recover-from-failure',
  stage: 4,
  title: 'Recover from failure',
  summary: 'Notice a dead path in under a second.',
}

export const MISSION_FIXTURE: MissionDefinition = {
  id: 'the-link-that-never-went-down',
  version: 1,
  title: 'The Link That Never Went Down',
  chapter: CHAPTER_FIXTURE.id,
  objective: 'When the link between a and c stops passing packets, traffic is back through b in under two seconds.',
  prerequisites: [],
  network: TRIANGLE,
  fault: { link: ['a', 'c'] },
  probe: { id: 'a-to-c', from: 'a', source: '10.255.0.1', destination: '10.255.0.3', intervalMs: 50 },
  recoveryTargetMs: 2000,
  objectives: [
    {
      id: 'reaches-c',
      text: 'Send a probe from a to c and see the replies come back.',
      check: { kind: 'reachable', minReplies: 3 },
      hints: [
        { text: 'Select router a on the map, then use Send probe.' },
        { text: "In a's terminal, send three packets to c's address.", command: 'ping -c 3 10.255.0.3' },
      ],
    },
    {
      id: 'direct-while-healthy',
      text: "Find the way a's traffic takes to c while the network is healthy.",
      check: { kind: 'path', before: 'a-c' },
      hints: [
        { text: "Open FRR's console on a with vtysh." },
        { text: "Ask a for its route to c's address.", command: 'show ip route 10.255.0.3' },
      ],
    },
    {
      id: 'recovers-through-b',
      text: 'Break the link and get traffic back through b in under two seconds.',
      check: { kind: 'recovery', via: 'a-b' },
      hints: [
        { text: 'Run the fault once as it is and read the timeline.' },
        { text: 'BFD is a small protocol whose only job is to notice sooner.' },
        { text: "Turn BFD on for OSPF on a's interface to c, and on c's interface to a.", command: 'ip ospf bfd' },
      ],
    },
  ],
}

export const INCIDENT_FIXTURE = [
  '# Incident: traffic to c stopped for half a minute',
  '',
  '**What users saw.** Traffic from router a to router c stopped for about 35 seconds, then came back by itself.',
  '',
  '**What is strange.** The direct link between a and c never went down. Both interfaces stayed up the whole time.',
  '',
].join('\n')

export const DEBRIEF_FIXTURE = [
  '# Debrief: the link that never went down',
  '',
  '## Why the interfaces stayed up',
  '',
  'An interface is "up" when the cable has a signal. That says nothing about whether packets get through.',
  '',
  '## What noticed, the second time',
  '',
  '**BFD** (Bidirectional Forwarding Detection) does one thing: it tells OSPF the neighbor is gone.',
  '',
  '## Try it on real FRR',
  '',
  'The same commands work on any FRR router:',
  '',
  '```',
  'vtysh',
  'show ip ospf neighbor',
  'configure terminal',
  ' interface a-c',
  '  ip ospf bfd',
  'end',
  '```',
  '',
].join('\n')

/** The game's content with this one mission in it, as `useContent()` hands it to a container. */
export const CONTENT_FIXTURE: LoadedContent = {
  game: {
    chapters: [CHAPTER_FIXTURE],
    missions: [MISSION_FIXTURE],
    mission: (id) => (id === MISSION_FIXTURE.id ? MISSION_FIXTURE : undefined),
    missionsIn: (chapter) => (chapter === CHAPTER_FIXTURE.id ? [MISSION_FIXTURE] : []),
  },
  textsOf: (id) => (id === MISSION_FIXTURE.id ? { incident: INCIDENT_FIXTURE, debrief: DEBRIEF_FIXTURE } : undefined),
  folderOf: (id) => (id === MISSION_FIXTURE.id ? '4-recover-from-failure/01-the-link-that-never-went-down' : undefined),
}
