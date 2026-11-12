import type { StampedMachineEvent } from '@peerfall/machine/types'
import { interfaceName } from '@peerfall/machine/utils'
import { CHECK_FAILURES, type CheckDefinition, type CheckResult, type Detection } from '#types/definitions/checks'
import type { RunContext } from '#types/definitions/mission'
import { type RunReading, readRun } from '#utils/checks/run-reading.util'
import { duringFault } from '#utils/events/index'

/**
 * What noticed the fault first: BFD's session going down or OSPF's dead timer expiring, on either
 * end of the faulted link. Other links' sessions and neighbors are ignored: they didn't break.
 */
export function detectionOf(reading: RunReading, context: RunContext): Detection | null {
  const { fault } = reading
  if (!fault || !context.fault) {
    return null
  }
  const [first, second] = context.fault.link
  const ends = new Set([`${first}/${interfaceName(first, second)}`, `${second}/${interfaceName(second, first)}`])
  for (const event of reading.events) {
    if (
      (event.type === 'bfd_session_down' || event.type === 'ospf_dead_timer_expired') &&
      duringFault(fault, event.timeMs) &&
      ends.has(`${event.router}/${event.interface}`)
    ) {
      return {
        event: event.type,
        router: event.router,
        interface: event.interface,
        atMs: event.timeMs,
        afterFaultMs: event.timeMs - fault.atMs,
      }
    }
  }
  return null
}

export function firstDetection(events: readonly StampedMachineEvent[], context: RunContext): Detection | null {
  return detectionOf(readRun(events, context), context)
}

export function checkDetectedBy(
  events: readonly StampedMachineEvent[],
  context: RunContext,
  check: Extract<CheckDefinition, { kind: 'detected-by' }>
): Extract<CheckResult, { kind: 'detected-by' }> {
  const reading = readRun(events, context)
  const detection = detectionOf(reading, context)
  const result = (failure: Extract<CheckResult, { kind: 'detected-by' }>['failure']) =>
    ({ kind: 'detected-by', passed: failure === null, failure, detection }) as const
  if (!reading.fault) {
    return result(CHECK_FAILURES.noFault)
  }
  if (!detection) {
    return result(CHECK_FAILURES.notDetected)
  }
  return result(detection.event === check.event ? null : CHECK_FAILURES.wrongDetector)
}
