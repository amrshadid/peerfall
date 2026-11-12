import type { LinkName, NetworkDefinition } from '@peerfall/machine/types'

/**
 * What a link is doing. `dropping`: both interfaces are up and every packet is lost, which is the
 * fault the Machine injects; `down`: the interfaces themselves are down.
 */
export type LinkState = 'up' | 'dropping' | 'down'

export interface LinkStatus {
  readonly link: LinkName
  readonly state: LinkState
}

/** A place on the drawing, in percent of its width and height. */
export interface TopologyPoint {
  readonly x: number
  readonly y: number
}

/** A link as it is drawn: where it runs, what it is doing and whether traffic takes it. */
export interface TopologyLinkView {
  /** `a-c`: the two routers in the order the network's definition gives them. */
  readonly key: string
  readonly ends: LinkName
  readonly from: TopologyPoint
  readonly to: TopologyPoint
  readonly state: LinkState
  readonly onPath: boolean
}

export interface TopologyRouterView {
  readonly name: string
  /** The loopback address without its prefix length, or null when the router has none. */
  readonly loopback: string | null
  readonly at: TopologyPoint
  readonly onPath: boolean
}

export interface TopologyView {
  readonly routers: readonly TopologyRouterView[]
  readonly links: readonly TopologyLinkView[]
  /** `a → b → c`, or null when no path is known. */
  readonly pathText: string | null
}

export interface TopologyPresentationProps {
  network: NetworkDefinition
  /** Links left out are up. */
  linkStates: readonly LinkStatus[]
  /** The routers traffic passes, in order, e.g. `['a', 'b', 'c']`; null when no path is known. */
  activePath: readonly string[] | null
  /** What takes that path, e.g. "Probe a → c"; "Path" when left out. */
  pathLabel?: string
  /** The router the terminal is in; null for none. */
  selectedRouter: string | null
  onSelectRouter: (name: string) => void
}
