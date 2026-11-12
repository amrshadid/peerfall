import type { StampedMachineEvent } from '@peerfall/machine/types'
import {
  CHECK_FAILURES,
  type CheckDefinition,
  type CheckFailure,
  type CheckResult,
  ROUTE_STAMP_TOLERANCE_MS,
  type RouteHop,
} from '#types/definitions/checks'
import type { RunContext } from '#types/definitions/mission'
import { outageOf } from '#utils/checks/outage.util'
import { type RunReading, readRun } from '#utils/checks/run-reading.util'
import { forwardsOnlyThrough, routeAt } from '#utils/routes/index'

/** The route in use when the link broke; until it does, the route in use now. */
export function pathBeforeFault(reading: RunReading): RouteHop | null {
  return reading.fault ? routeAt(reading.routes, reading.fault.atMs) : (reading.routes.at(-1)?.route ?? null)
}

/** The route the reply that ended the outage came back over, or `null` while traffic is down. */
export function pathAfterRecovery(reading: RunReading, probeId: string | undefined): RouteHop | null {
  const backAtMs = outageOf(reading, probeId)?.toMs ?? null
  return backAtMs === null ? null : routeAt(reading.routes, backAtMs + ROUTE_STAMP_TOLERANCE_MS)
}

export function pathTaken(
  events: readonly StampedMachineEvent[],
  context: RunContext
): { readonly before: RouteHop | null; readonly after: RouteHop | null } {
  const reading = readRun(events, context)
  return { before: pathBeforeFault(reading), after: pathAfterRecovery(reading, context.probe?.id) }
}

function beforeFailure(expected: string | undefined, route: RouteHop | null): CheckFailure | null {
  if (expected === undefined) {
    return null
  }
  if (!route) {
    return CHECK_FAILURES.noRoute
  }
  return forwardsOnlyThrough(route, expected) ? null : CHECK_FAILURES.wrongPath
}

function afterFailure(expected: string | undefined, route: RouteHop | null, faulted: boolean): CheckFailure | null {
  if (expected === undefined) {
    return null
  }
  if (!faulted) {
    return CHECK_FAILURES.noFault
  }
  if (!route) {
    return CHECK_FAILURES.notRecovered
  }
  return forwardsOnlyThrough(route, expected) ? null : CHECK_FAILURES.wrongPath
}

export function checkPath(
  events: readonly StampedMachineEvent[],
  context: RunContext,
  check: Extract<CheckDefinition, { kind: 'path' }>
): Extract<CheckResult, { kind: 'path' }> {
  const reading = readRun(events, context)
  const before = pathBeforeFault(reading)
  const after = pathAfterRecovery(reading, context.probe?.id)
  const failure = beforeFailure(check.before, before) ?? afterFailure(check.after, after, reading.fault !== null)
  return { kind: 'path', passed: failure === null, failure, before, after }
}
