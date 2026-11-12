import type {
  LinkState,
  LinkStatus,
  TopologyLinkView,
  TopologyPoint,
  TopologyRouterView,
  TopologyView,
} from '@features/topology/types'
import type { LinkName, NetworkDefinition, StampedMachineEvent } from '@peerfall/machine/types'
import { PATH_ARROW, RING, STAGE, TURN } from './topology-layout.constants'

/** One key for a link whichever end is named first. */
export function linkKeyOf(first: string, second: string): string {
  return [first, second].sort().join('-')
}

/**
 * Routers evenly on a ring, in the order the network lists them, starting lower left and going over
 * the top: two sit side by side, three make a triangle with its point up, four a square.
 */
export function routerPositions(names: readonly string[]): ReadonlyMap<string, TopologyPoint> {
  const count = names.length
  if (count === 0) {
    return new Map()
  }
  const step = TURN.full / count
  const start = TURN.quarter + TURN.half / count
  const raw = names.map((_, index) => {
    const angle = ((start + index * step) * Math.PI) / TURN.half
    return { x: Math.cos(angle) * RING.radiusX, y: Math.sin(angle) * RING.radiusY }
  })
  // An odd ring is taller on one side: centre what was drawn, not the ring it was drawn on.
  const middle = (values: readonly number[]) => (Math.min(...values) + Math.max(...values)) / 2
  const offsetX = middle(raw.map((point) => point.x))
  const offsetY = middle(raw.map((point) => point.y))
  const round = (value: number) => Math.round(value * 100) / 100
  return new Map(
    names.map((name, index) => {
      const point = raw[index] ?? { x: 0, y: 0 }
      return [name, { x: round(STAGE.centerX + point.x - offsetX), y: round(STAGE.centerY + point.y - offsetY) }]
    })
  )
}

/** The links between neighbours on the path. */
export function pathLinkKeys(path: readonly string[] | null): ReadonlySet<string> {
  const keys = new Set<string>()
  for (let index = 1; index < (path?.length ?? 0); index++) {
    const from = path?.[index - 1]
    const to = path?.[index]
    if (from !== undefined && to !== undefined) {
      keys.add(linkKeyOf(from, to))
    }
  }
  return keys
}

export function pathTextOf(path: readonly string[] | null): string | null {
  return path && path.length > 1 ? path.join(PATH_ARROW) : null
}

const withoutPrefix = (address: string | undefined): string | null => address?.split('/')[0] ?? null

/** Everything the drawing shows, from the network and what is known about it now. */
export function topologyViewOf(
  network: NetworkDefinition,
  linkStates: readonly LinkStatus[],
  activePath: readonly string[] | null
): TopologyView {
  const positions = routerPositions(network.routers.map((router) => router.name))
  const states = new Map<string, LinkState>(
    linkStates.map(({ link, state }) => [linkKeyOf(link[0], link[1]), state] as const)
  )
  const onPath = pathLinkKeys(activePath)
  const center = { x: STAGE.centerX, y: STAGE.centerY }

  const routers: TopologyRouterView[] = network.routers.map((router) => ({
    name: router.name,
    loopback: withoutPrefix(router.loopback),
    at: positions.get(router.name) ?? center,
    onPath: activePath?.includes(router.name) ?? false,
  }))

  const links: TopologyLinkView[] = network.links.map(({ ends }) => {
    const [first, second] = ends
    const key = linkKeyOf(first.router, second.router)
    return {
      key,
      ends: [first.router, second.router],
      from: positions.get(first.router) ?? center,
      to: positions.get(second.router) ?? center,
      state: states.get(key) ?? 'up',
      onPath: onPath.has(key),
    }
  })

  return { routers, links, pathText: pathTextOf(activePath) }
}

/** Which links the Machine's events say are losing packets: a fault starts it, clearing the fault ends it. */
export function linkStatesOf(events: readonly StampedMachineEvent[]): readonly LinkStatus[] {
  const faulted = new Map<string, LinkName>()
  // By the Machine's clock: the order events reach the game in is not the order they happened in.
  for (const event of [...events].sort((a, b) => a.timeMs - b.timeMs)) {
    if (event.type === 'fault_injected') {
      faulted.set(linkKeyOf(event.link[0], event.link[1]), event.link)
    } else if (event.type === 'fault_cleared') {
      faulted.delete(linkKeyOf(event.link[0], event.link[1]))
    }
  }
  return [...faulted.values()].map((link) => ({ link, state: 'dropping' }))
}
