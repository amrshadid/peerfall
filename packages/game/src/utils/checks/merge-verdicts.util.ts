import type { MissionVerdict } from '#types/definitions/checks'

/**
 * The verdict of a play-through so far: an objective met by any read stays met, since a mission's
 * outcomes can be shown one at a time (the route on a now, the route back on c later). An
 * objective not met yet takes the latest read's result, so its reason stays current.
 */
export function mergeVerdicts(previous: MissionVerdict | null, latest: MissionVerdict): MissionVerdict {
  if (previous === null) {
    return latest
  }
  const metBefore = new Map(
    previous.objectives
      .filter((objective) => objective.result.passed)
      .map((objective) => [objective.objectiveId, objective])
  )
  const objectives = latest.objectives.map((objective) => metBefore.get(objective.objectiveId) ?? objective)
  return { passed: objectives.every((objective) => objective.result.passed), objectives }
}
