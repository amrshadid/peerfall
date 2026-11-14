import { IPV4, type StampedMachineEvent } from '@peerfall/machine/types'
import type { RouteHop } from '#types/definitions/checks'
import { inTimeOrder } from '#utils/events/index'

/** An IPv4 address as an unsigned 32-bit number, or `null` if it isn't one. */
export function ipv4ToNumber(address: string): number | null {
  if (!IPV4.test(address)) {
    return null
  }
  return address
    .split('.')
    .map(Number)
    .reduce((sum, octet) => sum * 256 + octet, 0)
}

interface Prefix {
  readonly network: number
  readonly length: number
}

// reads iproute2 ip/iproute.c: print_route(): a host route has no "/32", and 0.0.0.0/0 is "default".
function parsePrefix(prefix: string): Prefix | null {
  if (prefix === 'default') {
    return { network: 0, length: 0 }
  }
  const [address = '', length = '32', ...rest] = prefix.split('/')
  const network = ipv4ToNumber(address)
  const bits = Number(length)
  if (network === null || rest.length > 0 || !Number.isInteger(bits) || bits < 0 || bits > 32) {
    return null
  }
  return { network, length: bits }
}

/** Whether two prefixes are the same network, however they are written: `10.255.0.3` is `10.255.0.3/32`. */
export function samePrefix(first: string, second: string): boolean {
  const [one, other] = [parsePrefix(first), parsePrefix(second)]
  return one !== null && other !== null && one.network === other.network && one.length === other.length
}

function covers(prefix: Prefix, address: number): boolean {
  if (prefix.length === 0) {
    return true
  }
  // Division, not a shift: JavaScript's shifts are 32-bit signed and wrap at 32.
  const size = 2 ** (32 - prefix.length)
  return Math.floor(address / size) === Math.floor(prefix.network / size)
}

/** The route the kernel picks for `address` (see `ipv4ToNumber`): the longest prefix that covers it. */
export function longestPrefixMatch<Route extends { readonly prefix: string }>(
  routes: Iterable<Route>,
  address: number
): Route | null {
  let best: Route | null = null
  let bestLength = -1
  for (const route of routes) {
    const prefix = parsePrefix(route.prefix)
    if (prefix && prefix.length > bestLength && covers(prefix, address)) {
      best = route
      bestLength = prefix.length
    }
  }
  return best
}

/** A moment the route to a destination changed; `route` is `null` when the router was left with none. */
export interface RouteChange {
  readonly atMs: number
  readonly route: RouteHop | null
}

const hopsOf = (route: RouteHop | null): string =>
  route === null ? '' : route.nextHops.map((hop) => `${hop.via ?? ''}%${hop.interface}`).join(' ')

const sameHop = (first: RouteHop | null, second: RouteHop | null): boolean =>
  first?.prefix === second?.prefix && hopsOf(first) === hopsOf(second)

/**
 * Whether every packet for the route leaves through `interfaceName`. With equal-cost paths the
 * kernel shares flows between the next hops, so a route that only includes the interface doesn't
 * say the traffic used it.
 */
export const forwardsOnlyThrough = (route: RouteHop | null, interfaceName: string): boolean =>
  route?.nextHops.every((hop) => hop.interface === interfaceName) ?? false

/**
 * How `router` forwarded packets for `destination` over the run, from the kernel's own table
 * (`fib_install`, `fib_remove`): one entry each time the answer changed.
 */
export function routeChanges(
  events: readonly StampedMachineEvent[],
  router: string,
  destination: string
): readonly RouteChange[] {
  const address = ipv4ToNumber(destination)
  if (address === null) {
    return []
  }
  const table = new Map<string, RouteHop>()
  const changes: RouteChange[] = []
  let current: RouteHop | null = null
  for (const event of inTimeOrder(events)) {
    if ((event.type !== 'fib_install' && event.type !== 'fib_remove') || event.router !== router) {
      continue
    }
    if (event.type === 'fib_install') {
      const { prefix, via, nextHops, protocol, timeMs } = event
      table.set(prefix, { prefix, interface: event.interface, via, nextHops, protocol, atMs: timeMs })
    } else {
      table.delete(event.prefix)
    }
    const next = longestPrefixMatch(table.values(), address)
    if (!sameHop(current, next)) {
      changes.push({ atMs: event.timeMs, route: next })
    }
    current = next
  }
  return changes
}

/** The route in the list of changes that was in use at `atMs`. */
export function routeAt(changes: readonly RouteChange[], atMs: number): RouteHop | null {
  return changes.findLast((change) => change.atMs <= atMs)?.route ?? null
}
