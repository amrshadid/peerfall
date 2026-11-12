import type { KernelRoute, MachineState, RouterStatePart, StateRequest } from '@peerfall/machine/types'
import { configEntries } from '@peerfall/machine/utils'
import {
  CHECK_FAILURES,
  type CheckDefinition,
  type CheckResult,
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

const partOf = (check: StateCheck<'daemons' | 'route' | 'config'>): RouterStatePart => {
  switch (check.kind) {
    case 'daemons':
      return 'daemons'
    case 'route':
      return 'routes'
    case 'config':
      return check.source === 'running' ? 'runningConfig' : 'savedConfig'
  }
}

/**
 * What a mission's checks need read from the Machine: the parts of each router they name and the
 * pings they ask for, each once. `null` when no check reads the state.
 */
export function stateRequestOf(mission: Pick<MissionDefinition, 'objectives'>): StateRequest | null {
  const routers: Record<string, RouterStatePart[]> = {}
  const pings: { from: string; to: string; count: number }[] = []
  for (const { check } of mission.objectives) {
    if (!isStateCheck(check)) {
      continue
    }
    if (check.kind === 'reaches') {
      if (!pings.some((ping) => ping.from === check.from && ping.to === check.to)) {
        pings.push({ from: check.from, to: check.to, count: REACH_PACKETS })
      }
      continue
    }
    const part = partOf(check)
    const parts = routers[check.router] ?? []
    routers[check.router] = parts.includes(part) ? parts : [...parts, part]
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
  const { protocol, via, interface: name } = check
  return (
    (protocol === undefined || route.protocol === protocol) &&
    // With equal-cost paths the kernel shares the traffic: only a route that is all one way counts.
    (via === undefined || (route.nextHops.length > 0 && route.nextHops.every((hop) => hop.via === via))) &&
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

function checkReaches(check: StateCheck<'reaches'>, state: MachineState | null): StateResult<'reaches'> {
  const ping = state?.pings.find(({ from, to }) => from === check.from && to === check.to)
  const result = (failure: StateResult<'reaches'>['failure']) =>
    ({
      kind: 'reaches',
      passed: failure === null,
      failure,
      from: check.from,
      to: check.to,
      sent: ping?.sent ?? 0,
      received: ping?.received ?? 0,
    }) as const
  if (!ping) {
    return result(CHECK_FAILURES.notChecked)
  }
  return result(ping.received >= check.minReplies ? null : CHECK_FAILURES.unreachable)
}

const sameBlock = (first: readonly string[], second: readonly string[]): boolean =>
  first.length === second.length && first.every((line, at) => line === second[at])

function checkConfig(check: StateCheck<'config'>, state: MachineState | null): StateResult<'config'> {
  const router = state?.routers[check.router]
  const text = check.source === 'running' ? router?.runningConfig : router?.savedConfig
  const result = (failure: StateResult<'config'>['failure'], found: string | null) =>
    ({ kind: 'config', passed: failure === null, failure, router: check.router, source: check.source, found }) as const
  if (text === undefined) {
    return result(CHECK_FAILURES.notChecked, null)
  }
  // No text: FRR is not running, or there is no frr.conf. Either way the line is not there.
  const found = configEntries(text ?? '').find(
    ({ context, line }) => sameBlock(context, check.block) && (line === check.line || line.startsWith(`${check.line} `))
  )
  return result(found ? null : CHECK_FAILURES.notConfigured, found?.line ?? null)
}

/** Judges a check that reads the Machine's state; `not_checked` while that part has not been read. */
export function evaluateStateCheck(check: StateCheck, state: MachineState | null): CheckResult {
  switch (check.kind) {
    case 'daemons':
      return checkDaemons(check, state)
    case 'route':
      return checkRoute(check, state)
    case 'reaches':
      return checkReaches(check, state)
    case 'config':
      return checkConfig(check, state)
  }
}
