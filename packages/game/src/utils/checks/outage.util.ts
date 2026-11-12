import type { StampedMachineEvent } from '@peerfall/machine/types'
import { CHECK_FAILURES, type CheckDefinition, type CheckResult, type Outage } from '#types/definitions/checks'
import type { RunContext } from '#types/definitions/mission'
import { type RunReading, readRun, repliesDuringFault } from '#utils/checks/run-reading.util'

/**
 * The longest gap between two consecutive replies that ends after the fault began. A reply that
 * was already on its way when the link broke still arrives, so the gap is not always the first one.
 * While nothing has come back, the outage is open: it has a start and no length yet.
 */
export function outageOf(reading: RunReading, probeId: string): Outage | null {
  const { fault, replies } = reading
  if (!fault) {
    return null
  }
  let previous = replies.findLast((reply) => reply.timeMs <= fault.atMs)
  let longest: Outage | null = null
  let longestMs = 0
  for (const reply of repliesDuringFault(reading)) {
    if (previous && reply.timeMs - previous.timeMs > longestMs) {
      longestMs = reply.timeMs - previous.timeMs
      longest = { fromMs: previous.timeMs, toMs: reply.timeMs, durationMs: longestMs }
    }
    previous = reply
  }
  // Packets still going out unanswered after the last reply: if that has lasted longer than any
  // closed gap, traffic is down now and the outage has no end to measure yet.
  const lastProbeMs = reading.events.findLast((event) => isProbeEvent(event) && event.probe === probeId)?.timeMs
  if (previous && lastProbeMs !== undefined && lastProbeMs - previous.timeMs > longestMs) {
    return { fromMs: previous.timeMs, toMs: null, durationMs: null }
  }
  return longest
}

const isProbeEvent = (event: StampedMachineEvent): event is Extract<StampedMachineEvent, { readonly probe: string }> =>
  event.type === 'probe_lost' || event.type === 'probe_received'

export function measureOutage(events: readonly StampedMachineEvent[], context: RunContext): Outage | null {
  return outageOf(readRun(events, context), context.probe.id)
}

export function checkOutage(
  events: readonly StampedMachineEvent[],
  context: RunContext,
  check: Extract<CheckDefinition, { kind: 'outage' }>
): Extract<CheckResult, { kind: 'outage' }> {
  const reading = readRun(events, context)
  const outage = outageOf(reading, context.probe.id)
  const limitMs = check.maxMs ?? context.recoveryTargetMs
  const result = (failure: Extract<CheckResult, { kind: 'outage' }>['failure']) =>
    ({ kind: 'outage', passed: failure === null, failure, outage, limitMs }) as const
  if (!reading.fault) {
    return result(CHECK_FAILURES.noFault)
  }
  if (!outage || outage.durationMs === null) {
    return result(CHECK_FAILURES.notRecovered)
  }
  return result(outage.durationMs < limitMs ? null : CHECK_FAILURES.tooSlow)
}
