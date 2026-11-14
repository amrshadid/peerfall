import type { DetectionEvent, PeerProtocol } from '@peerfall/game/types'

/** What noticed a dead neighbor, as a player reads it. */
export const DETECTOR_NAMES: Readonly<Record<DetectionEvent, string>> = {
  bfd_session_down: 'BFD',
  ospf_dead_timer_expired: "OSPF's dead timer",
}

/**
 * Each term, said once in plain words beside the evidence that first shows it: an objective list
 * says each one only under the first objective that brings it up.
 */
export const TERMS = {
  reply: 'A reply is one packet that reached the far router and came back.',
  // With no route a router does not even send: Linux refuses with ENETUNREACH, which ping prints.
  route:
    "A route is the entry in a router's table that says where packets for a destination leave. Without one, Linux refuses to send them: `Network unreachable`.",
  interface:
    "An interface is a router's end of a link. Here each is named after the two routers it joins: `a-c` is a's end of the link to c.",
  detectors:
    "BFD is a small protocol whose only job is to notice a dead path fast. OSPF's dead timer is how long OSPF waits without hearing a neighbor before it gives up on it.",
  rib: "Zebra's routing table holds every route FRR knows, even one it keeps waiting. For each destination zebra selects one, the lowest distance, and only the selected route goes into the kernel's table, which forwards packets.",
  daemon:
    'A daemon is one of the programs FRR is made of: each routing protocol has its own, and `zebra` hands their routes to the kernel.',
  configuration:
    'The running configuration is what a router uses right now; the saved one, `frr.conf`, is what it starts with after a restart.',
  peer: 'A neighbor is a router the routing protocol talks to over a link. OSPF neighbors pass through states, Init, 2-Way, ExStart, Exchange, Loading, until Full: their databases are swapped. IS-IS neighbors end Up.',
  lsa: "OSPF's database holds LSAs, link-state advertisements: each router describes its links in one, and every router in an area keeps a copy of each.",
  size: 'The size is the bytes of data in each packet. A link carries packets only up to a size of its own, its MTU.',
} as const

/** Each routing protocol a `peer` check reads, and its daemon, as a player reads them. */
export const PEER_PROTOCOL_NAMES = {
  ospf: { name: 'OSPF', daemon: 'ospfd' },
  ospf6: { name: 'OSPFv3', daemon: 'ospf6d' },
  isis: { name: 'IS-IS', daemon: 'isisd' },
} as const satisfies Readonly<Record<PeerProtocol, { name: string; daemon: string }>>

/** Reads after "Last run:". */
export const NOT_TESTED = 'the link was not broken, and this is judged only when it breaks. Use **Break the link**.'

/** Reads after "Last run:". */
export const NOT_CHECKED = 'this has not been checked on the routers yet.'
