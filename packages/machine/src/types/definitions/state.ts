/** One route of a router's kernel routing table, as `ip route show` prints it: what forwarding really uses. */
export interface KernelRoute {
  /** `10.0.1.0/30`, `10.255.0.3` (a host route has no `/32`) or `default`. */
  readonly prefix: string
  /** Who put it there: `kernel` for a connected route, `static`, `ospf`… Empty when the line names none. */
  readonly protocol: string
  /** Where its packets go; more than one when equal-cost paths share them, none for a `blackhole` route. */
  readonly nextHops: readonly { readonly via: string | null; readonly interface: string }[]
}

/**
 * One route of zebra's routing table (the RIB), as `show ip route json` prints it. Unlike the
 * kernel's table it holds every route zebra knows, also those it did not select: a backup with a
 * higher distance waits here and never reaches the kernel.
 */
export interface RibRoute {
  /** As FRR writes it, always with its length: `10.255.0.3/32`. */
  readonly prefix: string
  /** Who gave zebra the route, in FRR's words: `static`, `connected`, `local`, `kernel`, `ospf`… */
  readonly protocol: string
  /** The administrative distance: for one prefix zebra selects the lowest. */
  readonly distance: number
  readonly metric: number
  /** Zebra chose it for this prefix (the `>` of `show ip route`). */
  readonly selected: boolean
  /** It is in the kernel's table (the `*` of `show ip route`). */
  readonly installed: boolean
  /** `via` is null for a directly connected route; `interface` is null when FRR names none. */
  readonly nextHops: readonly { readonly via: string | null; readonly interface: string | null }[]
}

/** One of a router's interfaces, as `ip -o link show` prints it. */
export interface InterfaceState {
  /** As the router names it: `a-c`, without the `@if3` that names the far end of a veth. */
  readonly name: string
  /**
   * Switched on and with a live far end: the flags hold both `UP` and `LOWER_UP`. An end switched
   * off shows neither; its far end shows `NO-CARRIER,…,UP`. A link that drops every packet with
   * `tc netem` keeps its carrier on both ends.
   */
  readonly carrier: boolean
}

/**
 * One peer of a link-state routing daemon (OSPF, OSPFv3, IS-IS), as its neighbor table lists it.
 * A peer is listed from the first packet heard: `state` says how far the two have got.
 */
export interface PeerState {
  /** The OSPF or OSPFv3 router id (`10.255.0.2`), or the IS-IS name: the peer's hostname, or its system id when isisd does not know it. */
  readonly peer: string
  /** The router's own interface the peer is heard on: `a-b`. */
  readonly interface: string
  /** As FRR writes it: `Full`, `ExStart`, `Init`… for OSPF and OSPFv3; `Up`, `Initializing`, `Down` for IS-IS. */
  readonly state: string
  /** The IS-IS level of the adjacency, 1 or 2; left out for OSPF. */
  readonly level?: number
}

/** The kinds of OSPF LSA a mission may ask about, under the names of `show ip ospf database`'s sections. */
export const OSPF_LSA_TYPES = ['router', 'network', 'summary', 'asbr-summary', 'external'] as const

export type OspfLsaType = (typeof OSPF_LSA_TYPES)[number]

/** One LSA of a router's OSPF link-state database, as `show ip ospf database json` lists it. */
export interface OspfLsa {
  /** The area whose database holds it, `0.0.0.1`; `null` for an external LSA, which every area shares. */
  readonly area: string | null
  readonly type: OspfLsaType
  /** The Link State ID: a router-LSA's router id, a summary's or an external's network. */
  readonly id: string
  /** The router id of the router that sent it. */
  readonly advRouter: string
}

/** What a mission may ask about one router. Each part is a command of its own, so only what is needed is read. */
export const ROUTER_STATE_PARTS = [
  'daemons',
  'routes',
  'rib',
  'rib6',
  'runningConfig',
  'savedConfig',
  'startedConfig',
  'links',
  'ospfNeighbors',
  'ospf6Neighbors',
  'isisNeighbors',
  'ospfDatabase',
] as const

export type RouterStatePart = (typeof ROUTER_STATE_PARTS)[number]

/** One router as it is now. A part that was not asked for is left out. */
export interface RouterState {
  /** The FRR daemons that answered vtysh, as `show daemons` names them; empty when none did. */
  readonly daemons?: readonly string[]
  readonly routes?: readonly KernelRoute[]
  /** Zebra's IPv4 routes, selected or not; empty when zebra did not answer. */
  readonly rib?: readonly RibRoute[]
  /** Zebra's IPv6 routes (`show ipv6 route json`), in the same shape; empty when zebra did not answer. */
  readonly rib6?: readonly RibRoute[]
  /** `show running-config` as text; `null` when no daemon answered. */
  readonly runningConfig?: string | null
  /** The router's `frr.conf` as it is on disk: what FRR starts with. `null` when there is none. */
  readonly savedConfig?: string | null
  /**
   * The router's `frr.conf` as it was when FRR last finished starting with its init script since
   * the network was built: watchfrr writes `watchfrr.started` once every daemon is up and has
   * read frr.conf, and the Machine copies the file at that moment. What a restart really started
   * from. `null` when FRR has not started that way since the network was built (the build's own
   * start does not count), or there was no frr.conf to start from.
   */
  readonly startedConfig?: string | null
  /** Every interface of the router's namespace, the loopback included; empty when the namespace is gone. */
  readonly links?: readonly InterfaceState[]
  /** ospfd's peers (`show ip ospf neighbor json`); empty when ospfd did not answer. */
  readonly ospfNeighbors?: readonly PeerState[]
  /** ospf6d's peers (`show ipv6 ospf6 neighbor json`); empty when ospf6d did not answer. */
  readonly ospf6Neighbors?: readonly PeerState[]
  /** isisd's adjacencies (`show isis neighbor json`); empty when isisd did not answer. */
  readonly isisNeighbors?: readonly PeerState[]
  /** ospfd's link-state database, every area's (`show ip ospf database json`); `null` when ospfd did not answer. */
  readonly ospfDatabase?: readonly OspfLsa[] | null
}

/** A few packets from one router to an address, sent when the state is read. */
export interface PingRequest {
  readonly from: string
  /** An IPv4 or an IPv6 address. */
  readonly to: string
  readonly count: number
  /** Bytes of data in each packet (ping's `-s`); ping's own 56 when left out. */
  readonly size?: number
}

export interface PingResult {
  readonly from: string
  readonly to: string
  /** As the request gave it: a large packet and a small one to one address are two results. */
  readonly size?: number
  readonly sent: number
  readonly received: number
}

/** What to read from the Machine: the parts of each router, and the pings to send. */
export interface StateRequest {
  readonly routers: Readonly<Record<string, readonly RouterStatePart[]>>
  readonly pings: readonly PingRequest[]
}

/**
 * The Machine as root found it at one moment: read with control lines, never from what the
 * player typed. Plain JSON-safe data, so a golden run can record it.
 */
export interface MachineState {
  readonly routers: Readonly<Record<string, RouterState>>
  readonly pings: readonly PingResult[]
}

/** The most packets one ping may send: a check needs a few, and each lost one costs a second. */
export const PING_MAX_COUNT = 10

/** The largest packet a check may send: above a jumbo frame's 9000 bytes nothing is learned. */
export const PING_MAX_SIZE = 9000
