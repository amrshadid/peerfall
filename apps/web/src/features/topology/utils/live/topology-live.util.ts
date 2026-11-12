import type { AdjacencyEnd, LinkAdjacency } from '@features/topology/types'
import { routeChanges } from '@peerfall/game/utils'
import type { NetworkDefinition, ProbeDefinition, StampedMachineEvent } from '@peerfall/machine/types'
import { interfaceName } from '@peerfall/machine/utils'

/** More equal-cost paths than this would not be told apart on the drawing. */
const MAX_PATHS = 4

/**
 * The OSPF adjacency on every link, from the last `ospf_adjacency_change` each of its two routers
 * logged for it. Events are in the order things happened, and go back when the Machine does, so
 * a link is Full again after a run.
 */
export function adjacenciesOf(
  network: NetworkDefinition,
  events: readonly StampedMachineEvent[]
): readonly LinkAdjacency[] {
  const endOf = (router: string, peer: string): AdjacencyEnd => {
    const name = interfaceName(router, peer)
    const last = events.findLast(
      (event) => event.type === 'ospf_adjacency_change' && event.router === router && event.interface === name
    )
    return { router, state: last?.type === 'ospf_adjacency_change' ? last.to : null }
  }
  return network.links.map(({ ends: [first, second] }) => ({
    link: [first.router, second.router],
    ends: [endOf(first.router, second.router), endOf(second.router, first.router)],
  }))
}

/** The router at the other end of one of `router`'s interfaces; undefined for an interface that is no link. */
function peerOn(network: NetworkDefinition, router: string, name: string): string | undefined {
  for (const { ends } of network.links) {
    const [first, second] = ends
    if (first.router === router && interfaceName(router, second.router) === name) {
      return second.router
    }
    if (second.router === router && interfaceName(router, first.router) === name) {
      return first.router
    }
  }
  return undefined
}

/**
 * The way the probe's packets go right now, router by router: at each one, the interfaces of the
 * route its kernel last installed for the probe's destination. Two next hops are two paths that
 * share the traffic. A path ends where the next router has no route; empty when the first has none.
 */
export function probePathsOf(
  network: NetworkDefinition,
  probe: Pick<ProbeDefinition, 'from' | 'destination'>,
  events: readonly StampedMachineEvent[]
): readonly (readonly string[])[] {
  const owner = network.routers.find((router) => router.loopback?.split('/')[0] === probe.destination)?.name
  const walk = (router: string, seen: readonly string[]): string[][] => {
    const here = [...seen, router]
    if (router === owner) {
      return [here]
    }
    const route = routeChanges(events, router, probe.destination).at(-1)?.route ?? null
    const hops = route ? (route.nextHops.length > 0 ? route.nextHops : [route]) : []
    const peers = [...new Set(hops.map((hop) => peerOn(network, router, hop.interface)))].filter(
      // A route that points back the way the packet came is a loop: the path is told as far as it is known.
      (peer): peer is string => peer !== undefined && !here.includes(peer)
    )
    return peers.length === 0 ? [here] : peers.flatMap((peer) => walk(peer, here))
  }
  return walk(probe.from, [])
    .filter((path) => path.length > 1)
    .slice(0, MAX_PATHS)
}
