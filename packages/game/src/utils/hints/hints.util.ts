import type { HintDefinition, MissionDefinition, ObjectiveDefinition } from '#types/definitions/mission'

/** Guards against a count saved for an objective whose hints have since been cut. */
const clamp = (objective: ObjectiveDefinition, revealed: number): number =>
  Math.max(0, Math.min(revealed, objective.hints.length))

/** The hints shown so far for an objective, in order: where to look first. */
export function revealedHints(objective: ObjectiveDefinition, revealed: number): readonly HintDefinition[] {
  return objective.hints.slice(0, clamp(objective, revealed))
}

/** The hint revealed next, given how many are already shown; `null` once all are. */
export function nextHint(objective: ObjectiveDefinition, revealed: number): HintDefinition | null {
  return objective.hints[clamp(objective, revealed)] ?? null
}

export function hintsLeft(objective: ObjectiveDefinition, revealed: number): number {
  return objective.hints.length - clamp(objective, revealed)
}

/** How many hints a mission's objectives have revealed in all, from the saved counts. */
export function hintsUsed(mission: MissionDefinition, revealed: Readonly<Record<string, number>>): number {
  return mission.objectives.reduce((sum, objective) => sum + clamp(objective, revealed[objective.id] ?? 0), 0)
}
