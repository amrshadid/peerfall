import type { StampedMachineEvent } from '@peerfall/machine/types'
import type { CheckDefinition, CheckResult, MissionVerdict } from '#types/definitions/checks'
import type { MissionDefinition, RunContext } from '#types/definitions/mission'
import { checkDetectedBy } from '#utils/checks/detection.util'
import { checkOutage } from '#utils/checks/outage.util'
import { checkPath } from '#utils/checks/path.util'
import { checkReachable } from '#utils/checks/reachability.util'
import { checkRecovery } from '#utils/checks/recovery.util'

/** Judges one declared check against a run's events. */
export function evaluateCheck(
  check: CheckDefinition,
  events: readonly StampedMachineEvent[],
  context: RunContext
): CheckResult {
  switch (check.kind) {
    case 'reachable':
      return checkReachable(events, context, check)
    case 'path':
      return checkPath(events, context, check)
    case 'recovery':
      return checkRecovery(events, context, check)
    case 'outage':
      return checkOutage(events, context, check)
    case 'detected-by':
      return checkDetectedBy(events, context, check)
  }
}

/** Every objective's check over the same events; the mission passes only when all of them do. */
export function judgeMission(mission: MissionDefinition, events: readonly StampedMachineEvent[]): MissionVerdict {
  const objectives = mission.objectives.map((objective) => ({
    objectiveId: objective.id,
    result: evaluateCheck(objective.check, events, mission),
  }))
  return { passed: objectives.length > 0 && objectives.every(({ result }) => result.passed), objectives }
}
