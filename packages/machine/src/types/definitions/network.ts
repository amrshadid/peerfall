/** FRR daemons a mission may ask for besides zebra and mgmtd, which every router runs. */
export const FRR_DAEMONS = ['staticd', 'ospfd', 'ospf6d', 'isisd', 'bgpd', 'bfdd', 'vrrpd'] as const

export type FrrDaemon = (typeof FRR_DAEMONS)[number]

/** Started on every router, in this order, before a mission's own daemons: as FRR's init script does. */
export const FRR_BASE_DAEMONS = ['zebra', 'mgmtd'] as const

/**
 * How a router's FRR is started when the network is built. `direct`: each daemon is started by
 * the Machine and handed frr.conf. `watchfrr`: FRR's own init script starts watchfrr, which starts
 * the daemons, loads frr.conf and restarts a daemon that dies, as on an installed router. `none`:
 * FRR is installed and configured but not running; starting it is the player's.
 */
export const FRR_STARTUPS = ['direct', 'watchfrr', 'none'] as const

export type FrrStartup = (typeof FRR_STARTUPS)[number]

/** FRR's init script: `frrinit.sh start <router>` reads `/etc/frr/<router>/daemons` and starts watchfrr. */
export const FRR_INIT = '/usr/lib/frr/frrinit.sh'

/** FRR's own daemons its init script starts whatever the `daemons` file says, besides watchfrr itself. */
export const FRR_INIT_DAEMONS = ['mgmtd', 'zebra', 'staticd'] as const

export interface RouterDefinition {
  /** Also the namespace, FRR's `-N` name and the hostname: lower-case, at most 6 characters. */
  readonly name: string
  /** An address for `lo`, with its prefix length: `10.255.0.1/32`. */
  readonly loopback?: string
  /** An IPv6 address for `lo`, with its prefix length: `fd00::1/128`. Links stay IPv4: OSPFv3 and IS-IS talk over the link-local addresses the kernel gives every interface. */
  readonly loopback6?: string
  readonly daemons: readonly FrrDaemon[]
  /** The router's `frr.conf`, after the lines the Machine writes itself (hostname, log file). */
  readonly config: string
  /** `direct` when left out. With `watchfrr` and `none` the router also gets its `daemons` file. */
  readonly startup?: FrrStartup
}

export interface LinkEnd {
  readonly router: string
  /** The interface's address with its prefix length: `10.0.2.1/30`. */
  readonly address: string
  /**
   * The Machine leaves this end without its address: giving it, in FRR, is the player's. `address`
   * is then the one the mission plans for it.
   */
  readonly unaddressed?: boolean
  /** The largest packet this end sends, in bytes; Linux's 1500 when left out. */
  readonly mtu?: number
}

/** The MTUs Linux takes for an interface: IPv4 needs 68, and a veth stops at 65535. */
export const LINK_MTU = { min: 68, max: 65_535 } as const

/** A point-to-point cable. Each end's interface is named `<router>-<peer>`. */
export interface LinkDefinition {
  readonly ends: readonly [LinkEnd, LinkEnd]
}

export interface NetworkDefinition {
  readonly routers: readonly RouterDefinition[]
  readonly links: readonly LinkDefinition[]
}

/** The router is a shell word, a file name and half an interface name (15 characters at most). */
export const ROUTER_NAME = /^[a-z][a-z0-9]{0,5}$/

/** A probe's name is a shell word and part of a file name. */
export const PROBE_ID = /^[a-z][a-z0-9-]{0,15}$/

/** The bounds of a probe's interval: fast enough to measure a sub-second outage, slow enough for the Machine. */
export const PROBE_INTERVAL_MS = { min: 10, max: 10_000 } as const

export const IPV4 = /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/

export const IPV4_WITH_PREFIX = /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}\/(3[0-2]|[12]?\d)$/

/**
 * An IPv6 address as FRR and iproute2 write it: hex groups and colons, `::` once at most. Only
 * those characters pass, so it is safe in a shell line; the kernel judges the rest.
 */
export const IPV6 = /^(?=.*:)(?!.*::.*::)[0-9a-f]{0,4}(:[0-9a-f]{0,4}){1,7}$/

export const IPV6_WITH_PREFIX = /^(?=.*:)(?!.*::.*::)[0-9a-f]{0,4}(:[0-9a-f]{0,4}){1,7}\/(12[0-8]|1[01]\d|[1-9]?\d)$/
