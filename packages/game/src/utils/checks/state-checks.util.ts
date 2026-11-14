import type {
  KernelRoute,
  MachineState,
  OspfLsa,
  PeerState,
  PingRequest,
  RibRoute,
  RouterStatePart,
  StateRequest,
} from '@peerfall/machine/types'
import { configEntries } from '@peerfall/machine/utils'
import {
  CHECK_FAILURES,
  type CheckDefinition,
  type CheckResult,
  type ConfigSource,
  PEER_FINAL_STATES,
  type PeerProtocol,
  REACH_PACKETS,
  STATE_CHECK_KINDS,
  type StateCheckKind,
} from '#types/definitions/checks'
import type { MissionDefinition } from '#types/definitions/mission'
import { ipv4ToNumber, longestPrefixMatch, samePrefix } from '#utils/routes/index'

type StateCheck<Kind extends StateCheckKind = StateCheckKind> = Extract<CheckDefinition, { readonly kind: Kind }>
type StateResult<Kind extends StateCheckKind> = Extract<CheckResult, { readonly kind: Kind }>

/** Whether a check reads the Machine's state rather than a run's events. */
export const isStateCheck = (check: CheckDefinition): check is StateCheck =>
  (STATE_CHECK_KINDS as readonly string[]).includes(check.kind)

/** Whether any of a mission's checks reads the Machine's state: such a mission has work to check. */
export const hasStateChecks = (mission: Pick<MissionDefinition, 'objectives'>): boolean =>
  mission.objectives.some((objective) => isStateCheck(objective.check))

/** Whether any of a mission's checks reads a run of its probe or its fault from the events. */
export const hasRunChecks = (mission: Pick<MissionDefinition, 'objectives'>): boolean =>
  mission.objectives.some((objective) => !isStateCheck(objective.check))

/** The part of a router's state each config source reads. */
const CONFIG_PARTS = {
  running: 'runningConfig',
  saved: 'savedConfig',
  started: 'startedConfig',
} as const satisfies Record<ConfigSource, RouterStatePart>

/** The part of a router's state each protocol's neighbor table is. */
const PEER_PARTS = {
  ospf: 'ospfNeighbors',
  ospf6: 'ospf6Neighbors',
  isis: 'isisNeighbors',
} as const satisfies Record<PeerProtocol, RouterStatePart>

/** Zebra keeps IPv4 and IPv6 routes in two tables, read by two commands. */
const ribPartFor = (prefixOrAddress: string) => (prefixOrAddress.includes(':') ? 'rib6' : 'rib')

const partOf = (check: StateCheck<Exclude<StateCheckKind, 'reaches'>>): RouterStatePart => {
  switch (check.kind) {
    case 'daemons':
      return 'daemons'
    case 'route':
      return 'routes'
    case 'rib':
      return ribPartFor(check.prefix)
    case 'config':
      return CONFIG_PARTS[check.source]
    case 'peer':
      return PEER_PARTS[check.protocol]
    case 'lsa':
      return 'ospfDatabase'
  }
}

const samePing = (ping: { from: string; to: string; size?: number }, check: StateCheck<'reaches'>): boolean =>
  ping.from === check.from && ping.to === check.to && ping.size === check.size

/**
 * What a mission's checks need read from the Machine: the parts of each router they name and the
 * pings they ask for, each once. `null` when no check reads the state.
 */
export function stateRequestOf(mission: Pick<MissionDefinition, 'objectives'>): StateRequest | null {
  const routers: Record<string, RouterStatePart[]> = {}
  const pings: PingRequest[] = []
  const ask = (router: string, part: RouterStatePart) => {
    const parts = routers[router] ?? []
    routers[router] = parts.includes(part) ? parts : [...parts, part]
  }
  for (const { check } of mission.objectives) {
    if (!isStateCheck(check)) {
      continue
    }
    if (check.kind === 'reaches') {
      if (!pings.some((ping) => samePing(ping, check))) {
        const { from, to, size } = check
        pings.push({ from, to, count: REACH_PACKETS, ...(size !== undefined && { size }) })
      }
      // zebra's table tells whether the address is the sender's own.
      ask(check.from, ribPartFor(check.to))
      continue
    }
    ask(check.router, partOf(check))
  }
  return Object.keys(routers).length === 0 && pings.length === 0 ? null : { routers, pings }
}

function checkDaemons(check: StateCheck<'daemons'>, state: MachineState | null): StateResult<'daemons'> {
  const running = state?.routers[check.router]?.daemons
  const result = (failure: StateResult<'daemons'>['failure'], missing: readonly string[]) =>
    ({
      kind: 'daemons',
      passed: failure === null,
      failure,
      router: check.router,
      running: running ?? [],
      missing,
    }) as const
  if (running === undefined) {
    return result(CHECK_FAILURES.notChecked, check.daemons)
  }
  const missing = check.daemons.filter((daemon) => !running.includes(daemon))
  return result(missing.length === 0 ? null : CHECK_FAILURES.daemonsDown, missing)
}

/** The kernel's route a `route` check asks about: for exactly its prefix, or the one its address would use. */
function routeFor(check: StateCheck<'route'>, routes: readonly KernelRoute[]): KernelRoute | null {
  if (check.prefix !== undefined) {
    const { prefix } = check
    return routes.find((route) => samePrefix(route.prefix, prefix)) ?? null
  }
  const address = check.to === undefined ? null : ipv4ToNumber(check.to)
  return address === null ? null : longestPrefixMatch(routes, address)
}

function isRouteAsked(check: StateCheck<'route'>, route: KernelRoute): boolean {
  const { protocol, via, vias, interface: name } = check
  const hops = new Set(route.nextHops.map((hop) => hop.via))
  return (
    (protocol === undefined || route.protocol === protocol) &&
    // With equal-cost paths the kernel shares the traffic: only a route that is all one way counts.
    (via === undefined || (route.nextHops.length > 0 && route.nextHops.every((hop) => hop.via === via))) &&
    // Every path asked for, and no other: both ways used at once.
    (vias === undefined || (hops.size === vias.length && vias.every((hop) => hops.has(hop)))) &&
    (name === undefined || (route.nextHops.length > 0 && route.nextHops.every((hop) => hop.interface === name)))
  )
}

function checkRoute(check: StateCheck<'route'>, state: MachineState | null): StateResult<'route'> {
  const routes = state?.routers[check.router]?.routes
  const result = (failure: StateResult<'route'>['failure'], route: KernelRoute | null) =>
    ({ kind: 'route', passed: failure === null, failure, router: check.router, route }) as const
  if (routes === undefined) {
    return result(CHECK_FAILURES.notChecked, null)
  }
  const route = routeFor(check, routes)
  if (!route) {
    return result(CHECK_FAILURES.noRoute, null)
  }
  return result(isRouteAsked(check, route) ? null : CHECK_FAILURES.wrongRoute, route)
}

const isRibRouteAsked = (check: StateCheck<'rib'>, route: RibRoute): boolean =>
  (check.protocol === undefined || route.protocol === check.protocol) &&
  // One route of zebra's carries every equal-distance next hop: being one of them is enough.
  (check.via === undefined || route.nextHops.some((hop) => hop.via === check.via)) &&
  (check.selected === undefined || route.selected === check.selected)

function checkRib(check: StateCheck<'rib'>, state: MachineState | null): StateResult<'rib'> {
  const rib = state?.routers[check.router]?.[ribPartFor(check.prefix)]
  const result = (failure: StateResult<'rib'>['failure'], routes: readonly RibRoute[], found: RibRoute | null) =>
    ({ kind: 'rib', passed: failure === null, failure, router: check.router, routes, found }) as const
  if (rib === undefined) {
    return result(CHECK_FAILURES.notChecked, [], null)
  }
  const routes = rib.filter((route) => samePrefix(route.prefix, check.prefix))
  if (routes.length === 0) {
    return result(CHECK_FAILURES.noRibRoute, routes, null)
  }
  const found = routes.find((route) => isRibRouteAsked(check, route)) ?? null
  return result(found ? null : CHECK_FAILURES.wrongRibRoute, routes, found)
}

function checkReaches(check: StateCheck<'reaches'>, state: MachineState | null): StateResult<'reaches'> {
  const ping = state?.pings.find((sent) => samePing(sent, check))
  const result = (failure: StateResult<'reaches'>['failure']) =>
    ({
      kind: 'reaches',
      passed: failure === null,
      failure,
      from: check.from,
      to: check.to,
      ...(check.size !== undefined && { size: check.size }),
      sent: ping?.sent ?? 0,
      received: ping?.received ?? 0,
    }) as const
  if (!ping) {
    return result(CHECK_FAILURES.notChecked)
  }
  // A router answers a ping to its own address itself. With zebra down the table is empty, and the
  // ping alone decides.
  const host = check.to.includes(':') ? `${check.to}/128` : `${check.to}/32`
  const own = state?.routers[check.from]?.[ribPartFor(check.to)]?.some(
    (route) => route.protocol === 'local' && samePrefix(route.prefix, host)
  )
  if (own) {
    return result(CHECK_FAILURES.ownAddress)
  }
  return result(ping.received >= check.minReplies ? null : CHECK_FAILURES.unreachable)
}

const sameBlock = (first: readonly string[], second: readonly string[]): boolean =>
  first.length === second.length && first.every((line, at) => line === second[at])

function checkConfig(check: StateCheck<'config'>, state: MachineState | null): StateResult<'config'> {
  const router = state?.routers[check.router]
  const text = router?.[CONFIG_PARTS[check.source]]
  const result = (failure: StateResult<'config'>['failure'], found: string | null) =>
    ({ kind: 'config', passed: failure === null, failure, router: check.router, source: check.source, found }) as const
  if (text === undefined) {
    return result(CHECK_FAILURES.notChecked, null)
  }
  if (check.absent && text === null) {
    // A line missing from a configuration that does not exist proves nothing about it.
    return result(CHECK_FAILURES.noConfig, null)
  }
  // No text: FRR is not running, or there is no frr.conf. Either way the line is not there.
  const found = configEntries(text ?? '').find(
    ({ context, line }) => sameBlock(context, check.block) && (line === check.line || line.startsWith(`${check.line} `))
  )
  if (check.absent) {
    return result(found ? CHECK_FAILURES.stillConfigured : null, found?.line ?? null)
  }
  return result(found ? null : CHECK_FAILURES.notConfigured, found?.line ?? null)
}

function checkPeer(check: StateCheck<'peer'>, state: MachineState | null): StateResult<'peer'> {
  const peers = state?.routers[check.router]?.[PEER_PARTS[check.protocol]]
  const result = (failure: StateResult<'peer'>['failure'], found: PeerState | null) =>
    ({
      kind: 'peer',
      passed: failure === null,
      failure,
      router: check.router,
      protocol: check.protocol,
      peers: peers ?? [],
      found,
    }) as const
  if (peers === undefined) {
    return result(CHECK_FAILURES.notChecked, null)
  }
  const named = peers.filter(
    (peer) =>
      peer.peer === check.peer &&
      (check.interface === undefined || peer.interface === check.interface) &&
      (check.level === undefined || peer.level === check.level)
  )
  const final = named.find((peer) => peer.state === PEER_FINAL_STATES[check.protocol])
  if (final) {
    return result(null, final)
  }
  const [first = null] = named
  return result(first ? CHECK_FAILURES.peerNotFull : CHECK_FAILURES.noPeer, first)
}

function checkLsa(check: StateCheck<'lsa'>, state: MachineState | null): StateResult<'lsa'> {
  const database = state?.routers[check.router]?.ospfDatabase
  const result = (failure: StateResult<'lsa'>['failure'], found: OspfLsa | null) =>
    ({ kind: 'lsa', passed: failure === null, failure, router: check.router, found }) as const
  if (database === undefined) {
    return result(CHECK_FAILURES.notChecked, null)
  }
  if (check.absent && database === null) {
    // An LSA missing from a database that cannot be read proves nothing about it.
    return result(CHECK_FAILURES.noDatabase, null)
  }
  const found =
    (database ?? []).find(
      (lsa) =>
        lsa.type === check.type &&
        lsa.id === check.id &&
        lsa.area === (check.area ?? null) &&
        (check.advRouter === undefined || lsa.advRouter === check.advRouter)
    ) ?? null
  if (check.absent) {
    return result(found ? CHECK_FAILURES.lsaPresent : null, found)
  }
  return result(found ? null : CHECK_FAILURES.noLsa, found)
}

/** Judges a check that reads the Machine's state; `not_checked` while that part has not been read. */
export function evaluateStateCheck(check: StateCheck, state: MachineState | null): CheckResult {
  switch (check.kind) {
    case 'daemons':
      return checkDaemons(check, state)
    case 'route':
      return checkRoute(check, state)
    case 'rib':
      return checkRib(check, state)
    case 'reaches':
      return checkReaches(check, state)
    case 'config':
      return checkConfig(check, state)
    case 'peer':
      return checkPeer(check, state)
    case 'lsa':
      return checkLsa(check, state)
  }
}
