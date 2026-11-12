import type { JourneyStage, TitleFigure } from '@features/title/types'
import type { LinkDefinition, RouterDefinition } from '@peerfall/machine/types'

/** The one mission being built, named here until the missions package loads its content. */
export const FIRST_MISSION = {
  id: 'the-link-that-never-went-down',
  title: 'The Link That Never Went Down',
  stage: 4,
} as const

/** The journey as README.md lists it ("What you'll learn"), in play order. */
export const JOURNEY: readonly JourneyStage[] = [
  { number: 1, name: 'First router', parts: 'watchfrr, mgmtd, vtysh', missionId: null },
  { number: 2, name: 'Follow a packet', parts: 'zebra, staticd', missionId: null },
  { number: 3, name: 'Build an underlay', parts: 'ospfd, ospf6d, isisd', missionId: null },
  { number: 4, name: 'Recover from failure', parts: 'bfdd, vrrpd', missionId: FIRST_MISSION.id },
  { number: 5, name: 'The other interior protocols', parts: 'ripd, eigrpd, babeld', missionId: null },
  { number: 6, name: 'Exchange routes', parts: 'bgpd', missionId: null },
  { number: 7, name: 'Control what is advertised', parts: 'route maps, RPKI, pbrd', missionId: null },
  { number: 8, name: 'Isolate and connect tenants', parts: 'VRFs, L3VPN, EVPN', missionId: null },
  { number: 9, name: 'Label and steer', parts: 'ldpd, SR, pathd', missionId: null },
  { number: 10, name: 'Deliver multicast', parts: 'pimd, pim6d', missionId: null },
  { number: 11, name: 'Operate a network', parts: 'debugs, JSON, BMP', missionId: null },
]

const NAMES = ['a', 'b', 'c'] as const

// Only drawn, never started: the figure needs the routers' names and addresses, not their configuration.
const router = (name: string, id: number): RouterDefinition => ({
  name,
  loopback: `10.255.0.${id}/32`,
  daemons: [],
  config: '',
})

const link = (first: string, second: string, subnet: number): LinkDefinition => ({
  ends: [
    { router: first, address: `10.0.${subnet}.1/30` },
    { router: second, address: `10.0.${subnet}.2/30` },
  ],
})

/** Fig. 1: the first mission's network at the moment it teaches about. */
export const TITLE_FIGURE: TitleFigure = {
  network: {
    routers: NAMES.map((name, at) => router(name, at + 1)),
    links: [link('a', 'b', 1), link('a', 'c', 2), link('b', 'c', 3)],
  },
  linkStates: [{ link: ['a', 'c'], state: 'dropping' }],
  activePath: ['a', 'b', 'c'],
  caption: 'Fig. 1. Three routers. The link from a to c is dropping packets, so traffic goes round through b.',
}

export const FIGURE_KEY = 'Solid line: up. Dashed: dropping packets. Red band: the path traffic takes.'
