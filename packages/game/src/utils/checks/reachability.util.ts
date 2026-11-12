import type { StampedMachineEvent } from '@peerfall/machine/types'
import { CHECK_FAILURES, type CheckDefinition, type CheckResult } from '#types/definitions/checks'
import type { RunContext } from '#types/definitions/mission'
import { readRun } from '#utils/checks/run-reading.util'

/** How many replies the probe got while the network was healthy: all of them until a fault is injected. */
export function repliesBeforeFault(events: readonly StampedMachineEvent[], context: RunContext): number {
  const { fault, replies } = readRun(events, context)
  return fault ? replies.filter((reply) => reply.timeMs <= fault.atMs).length : replies.length
}

export function checkReachable(
  events: readonly StampedMachineEvent[],
  context: RunContext,
  check: Extract<CheckDefinition, { kind: 'reachable' }>
): Extract<CheckResult, { kind: 'reachable' }> {
  const replies = repliesBeforeFault(events, context)
  const passed = replies >= check.minReplies
  return { kind: 'reachable', passed, failure: passed ? null : CHECK_FAILURES.unreachable, replies }
}
