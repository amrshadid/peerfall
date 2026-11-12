/** FRR daemons a mission may ask for besides zebra and mgmtd, which every router runs. */
export const FRR_DAEMONS = ['staticd', 'ospfd', 'ospf6d', 'isisd', 'bgpd', 'bfdd'] as const

export type FrrDaemon = (typeof FRR_DAEMONS)[number]

/** Started on every router, in this order, before a mission's own daemons: as FRR's init script does. */
export const FRR_BASE_DAEMONS = ['zebra', 'mgmtd'] as const

export interface RouterDefinition {
  /** Also the namespace, FRR's `-N` name and the hostname: lower-case, at most 6 characters. */
  readonly name: string
  /** An address for `lo`, with its prefix length: `10.255.0.1/32`. */
  readonly loopback?: string
  readonly daemons: readonly FrrDaemon[]
  /** The router's `frr.conf`, after the lines the Machine writes itself (hostname, log file). */
  readonly config: string
}

export interface LinkEnd {
  readonly router: string
  /** The interface's address with its prefix length: `10.0.2.1/30`. */
  readonly address: string
}

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

export const IPV4_WITH_PREFIX = /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}\/(3[0-2]|[12]?\d)$/
