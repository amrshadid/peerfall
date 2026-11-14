import type { JourneyChapterSource, JourneyMissionSource } from '@features/map/types'
import type { MissionStatus } from '@peerfall/game/types'

// For the map's tests only: the curriculum's eleven stages as the game lists them, and missions made
// up where a test needs more than the one that is written.

const STAGES: readonly (readonly [id: string, title: string, summary: string])[] = [
  ['first-router', 'First router', 'Start FRR on Linux, find its daemons, use vtysh, and save a configuration.'],
  ['follow-a-packet', 'Follow a packet', 'Connected and static routes, next hops, and the way into forwarding.'],
  ['build-an-underlay', 'Build an underlay', 'OSPF and IS-IS adjacencies, the link-state database and costs.'],
  ['recover-from-failure', 'Recover from failure', 'Measure an outage and make the network notice it sooner.'],
  ['other-interior-protocols', 'The other interior protocols', 'RIP, EIGRP, Babel, OpenFabric and NHRP.'],
  ['exchange-routes', 'Exchange routes', 'BGP sessions, best-path selection and route reflectors.'],
  ['control-what-is-advertised', 'Control what is advertised', 'Prefix lists, communities and route maps.'],
  ['isolate-and-connect-tenants', 'Isolate and connect tenants', 'VRFs, route leaking, L3VPN and EVPN.'],
  ['label-and-steer', 'Label and steer', 'MPLS, LDP, Segment Routing, SRv6 and engineered paths.'],
  ['deliver-multicast', 'Deliver multicast', 'Group membership, the distribution tree and rendezvous points.'],
  ['operate-a-network', 'Operate a network', 'Diagnose, monitor, automate, verify and roll back.'],
]

export const FIRST_MISSION: JourneyMissionSource = {
  id: 'the-link-that-never-went-down',
  title: 'The Link That Never Went Down',
  objective: 'Make the network notice a link that drops every packet while its interfaces stay up.',
  skills: ['outage-measure', 'bfd-fast-detection'],
  prerequisites: [],
  recoveryTargetMs: 2000,
  minutes: 25,
  codex: [{ id: 'bfd', term: 'BFD', simple: 'A fast hello between two neighbours.', sources: ['bfdd/bfd.c'] }],
}

export const SECOND_MISSION: JourneyMissionSource = {
  id: 'a-restart-nobody-noticed',
  title: 'A Restart Nobody Noticed',
  objective: 'Restart a routing daemon without its neighbours dropping a packet.',
  skills: ['graceful-restart'],
  prerequisites: ['bfd-fast-detection'],
  recoveryTargetMs: 500,
  codex: [],
}

/** The skill tree's part the fixture's missions name; `graceful-restart` is left out, to be named by its id. */
export const JOURNEY_SKILLS = [
  { id: 'outage-measure', title: 'Measure an outage and tell what noticed it' },
  { id: 'bfd-fast-detection', title: 'Make OSPF notice a dead link in under a second with BFD' },
] as const

/** Stage 4's one region, as chapters.yaml writes it. */
const NOTICE_IT_FAST = {
  id: 'notice-it-fast',
  name: 'Notice it fast',
  caption: 'measure an outage, the OSPF dead timer, BFD',
  guide: 'bfdd, zebra',
  source: 'bfdd/, ospfd/ospf_bfd.c, ospfd/ospf_nsm.c',
}

type Missions = JourneyChapterSource['missions']

function entry(mission: JourneyMissionSource, status: MissionStatus, attempts = 0, hintsUsed = 0): Missions[number] {
  return { mission, status, attempts, hintsUsed }
}

function journey(missions: Missions): readonly JourneyChapterSource[] {
  return STAGES.map(([id, title, summary], index) => {
    const own = id === 'recover-from-failure' ? missions : []
    const regions = own.length === 0 ? [] : [{ ...NOTICE_IT_FAST, missions: own.map((each) => each.mission.id) }]
    return { chapter: { id, stage: index + 1, title, summary, outcomes: [], regions }, missions: own }
  })
}

/** The curriculum as it is today: eleven stages and the one mission of stage 4. */
export function journeyFixture(status: MissionStatus = 'available', attempts = 0, hintsUsed = 0) {
  return journey([entry(FIRST_MISSION, status, attempts, hintsUsed)])
}

/** A second mission in stage 4 that needs the first: completed and available, or under way and locked. */
export function longerJourneyFixture(firstDone: boolean) {
  return journey(
    firstDone
      ? [entry(FIRST_MISSION, 'completed', 3, 2), entry(SECOND_MISSION, 'available')]
      : [entry(FIRST_MISSION, 'in_progress', 1), entry(SECOND_MISSION, 'locked')]
  )
}
