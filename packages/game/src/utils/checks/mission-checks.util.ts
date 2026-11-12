import type { MachineState, StampedMachineEvent } from '@peerfall/machine/types'
import type { CheckDefinition, CheckResult, MissionVerdict } from '#types/definitions/checks'
import type { MissionDefinition, RunContext } from '#types/definitions/mission'
import { checkDetectedBy } from '#utils/checks/detection.util'
import { checkOutage } from '#utils/checks/outage.util'
import { checkPath } from '#utils/checks/path.util'
import { checkReachable } from '#utils/checks/reachability.util'
import { checkRecovery } from '#utils/checks/recovery.util'
import { evaluateStateCheck } from '#utils/checks/state-checks.util'

/**
 * Judges one declared check: a run check against the run's events, a state check against the
 * Machine's state as it was last read (`null` before the first reading).
 */
export function evaluateCheck(
  check: CheckDefinition,
  events: readonly StampedMachineEvent[],
  context: RunContext,
  state: MachineState | null = null
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
    default:
      return evaluateStateCheck(check, state)
  }
}

/**
 * Every objective's check over the same events and the same reading of the Machine's state; the
 * mission passes only when all of them do. Pure: the state is read by the flow and handed in.
 */
export function judgeMission(
  mission: MissionDefinition,
  events: readonly StampedMachineEvent[],
  state: MachineState | null = null
): MissionVerdict {
  const objectives = mission.objectives.map((objective) => ({
    objectiveId: objective.id,
    result: evaluateCheck(objective.check, events, mission, state),
  }))
  return { passed: objectives.length > 0 && objectives.every(({ result }) => result.passed), objectives }
}
