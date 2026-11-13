/** One route of a router's kernel routing table, as `ip route show` prints it: what forwarding really uses. */
export interface KernelRoute {
  /** `10.0.1.0/30`, `10.255.0.3` (a host route has no `/32`) or `default`. */
  readonly prefix: string
  /** Who put it there: `kernel` for a connected route, `static`, `ospf`… Empty when the line names none. */
  readonly protocol: string
  /** Where its packets go; more than one when equal-cost paths share them, none for a `blackhole` route. */
  readonly nextHops: readonly { readonly via: string | null; readonly interface: string }[]
}

/** What a mission may ask about one router. Each part is a command of its own, so only what is needed is read. */
export const ROUTER_STATE_PARTS = ['daemons', 'routes', 'runningConfig', 'savedConfig', 'startedConfig'] as const

export type RouterStatePart = (typeof ROUTER_STATE_PARTS)[number]

/** One router as it is now. A part that was not asked for is left out. */
export interface RouterState {
  /** The FRR daemons that answered vtysh, as `show daemons` names them; empty when none did. */
  readonly daemons?: readonly string[]
  readonly routes?: readonly KernelRoute[]
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
}

/** A few packets from one router to an address, sent when the state is read. */
export interface PingRequest {
  readonly from: string
  readonly to: string
  readonly count: number
}

export interface PingResult {
  readonly from: string
  readonly to: string
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
