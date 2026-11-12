import type { StampedMachineEvent } from '@peerfall/machine/types'
import {
  CHECK_FAILURES,
  type CheckDefinition,
  type CheckResult,
  type Recovery,
  ROUTE_STAMP_TOLERANCE_MS,
} from '#types/definitions/checks'
import type { RunContext } from '#types/definitions/mission'
import { type RunReading, readRun, repliesDuringFault } from '#utils/checks/run-reading.util'
import { forwardsOnlyThrough, routeAt } from '#utils/routes/index'

/**
 * The first reply after the fault that arrived while the probe's router was forwarding through
 * `via`. A reply to a packet that left before the link broke doesn't count: the route was still
 * the old one.
 */
export function recoveryOf(reading: RunReading, via: string): Recovery | null {
  const { fault } = reading
  if (!fault) {
    return null
  }
  for (const reply of repliesDuringFault(reading)) {
    const route = routeAt(reading.routes, reply.timeMs + ROUTE_STAMP_TOLERANCE_MS)
    if (route && forwardsOnlyThrough(route, via)) {
      return { sequence: reply.sequence, atMs: reply.timeMs, afterFaultMs: reply.timeMs - fault.atMs, route }
    }
  }
  return null
}

/** How long after the fault replies were back through `via`, or `null` if they never were. */
export function recoveryTimeMs(
  events: readonly StampedMachineEvent[],
  context: RunContext,
  via: string
): number | null {
  return recoveryOf(readRun(events, context), via)?.afterFaultMs ?? null
}

export function checkRecovery(
  events: readonly StampedMachineEvent[],
  context: RunContext,
  check: Extract<CheckDefinition, { kind: 'recovery' }>
): Extract<CheckResult, { kind: 'recovery' }> {
  const reading = readRun(events, context)
  const recovery = recoveryOf(reading, check.via)
  const limitMs = check.withinMs ?? context.recoveryTargetMs
  const result = (failure: Extract<CheckResult, { kind: 'recovery' }>['failure']) =>
    ({ kind: 'recovery', passed: failure === null, failure, recovery, limitMs }) as const
  if (!reading.fault) {
    return result(CHECK_FAILURES.noFault)
  }
  if (!recovery) {
    return result(CHECK_FAILURES.notRecovered)
  }
  return result(recovery.afterFaultMs < limitMs ? null : CHECK_FAILURES.tooSlow)
}
