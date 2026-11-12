import {
  RUN_STEPS,
  type RunComparison,
  type RunStep,
  type RunSummary,
  type StepComparison,
} from '#types/definitions/runs'

/** How long after its own fault a run reached a step. Runs start at different times, so only this compares. */
export function stepAfterFaultMs(summary: RunSummary, step: RunStep): number | null {
  switch (step) {
    case 'detection':
      return summary.detection?.afterFaultMs ?? null
    case 'adjacency':
      return summary.adjacencyChange?.afterFaultMs ?? null
    case 'route':
      return summary.routeUpdate?.afterFaultMs ?? null
    case 'probe':
      return summary.firstGoodProbe?.afterFaultMs ?? null
  }
}

const saved = (baselineMs: number | null, repairedMs: number | null): number | null =>
  baselineMs === null || repairedMs === null ? null : baselineMs - repairedMs

/** The same fault twice: as the network was given, and after the player's change. */
export function compareRuns(baseline: RunSummary, repaired: RunSummary): RunComparison {
  const steps = RUN_STEPS.map((step): StepComparison => {
    const baselineMs = stepAfterFaultMs(baseline, step)
    const repairedMs = stepAfterFaultMs(repaired, step)
    return { step, baselineMs, repairedMs, savedMs: saved(baselineMs, repairedMs) }
  })
  return {
    baseline,
    repaired,
    steps,
    outageSavedMs: saved(baseline.outage?.durationMs ?? null, repaired.outage?.durationMs ?? null),
    detectorChanged:
      baseline.detection !== null &&
      repaired.detection !== null &&
      baseline.detection.event !== repaired.detection.event,
  }
}
