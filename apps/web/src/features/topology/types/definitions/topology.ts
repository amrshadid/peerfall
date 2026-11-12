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

/** One router's view of its neighbor on a link. */
export interface AdjacencyEnd {
  readonly router: string
  /** The neighbor state as FRR names it (`Full`, `Deleted`, `ExStart`…); null while this end has reported none. */
  readonly state: string | null
}

/** The OSPF adjacency on a link, as each of its two routers last reported it. */
export interface LinkAdjacency {
  readonly link: LinkName
  readonly ends: readonly [AdjacencyEnd, AdjacencyEnd]
}

/** An adjacency in words: a short label for the drawing and a full sentence for whoever asks. */
export interface AdjacencyText {
  /** `OSPF Full`, `OSPF lost` or `OSPF forming`. */
  readonly label: string
  /** "a sees c as Full, c sees a as Deleted". */
  readonly detail: string
  /** Both ends are Full. */
  readonly full: boolean
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
  /** The OSPF adjacency over it; null when neither end has reported one. */
  readonly adjacency: AdjacencyText | null
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
  /** `a → b → c`, or null when no path is known. Several paths are joined: `a → c and a → b → c`. */
  readonly pathText: string | null
  /** Traffic is shared over more than one path. */
  readonly shared: boolean
}

/** What is known about the network beside its links' states. */
export interface TopologyLive {
  /** More paths the same traffic takes at once, when equal-cost routes share it. */
  readonly otherPaths?: readonly (readonly string[])[] | undefined
  readonly adjacencies?: readonly LinkAdjacency[] | undefined
}

export interface TopologyPresentationProps {
  network: NetworkDefinition
  /** Links left out are up. */
  linkStates: readonly LinkStatus[]
  /** The routers traffic passes, in order, e.g. `['a', 'b', 'c']`; null when no path is known. */
  activePath: readonly string[] | null
  /** What takes that path, e.g. "Probe a → c"; "Path" when left out. */
  pathLabel?: string
  /** More paths the same traffic takes at once, when equal-cost routes share it. */
  otherPaths?: readonly (readonly string[])[]
  /** The OSPF adjacency on each link, as its routers last reported it; links left out say nothing. */
  adjacencies?: readonly LinkAdjacency[]
  /** The terms the drawing uses, in plain words, under it; null or left out for none. */
  legend?: string | null
  /** The router the terminal is in; null for none. */
  selectedRouter: string | null
  onSelectRouter: (name: string) => void
}
