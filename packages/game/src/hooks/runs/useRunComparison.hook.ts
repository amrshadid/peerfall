import { useMemo } from 'react'
import { useProgressStore } from '#store/progress.store'
import type { RunComparison, SavedRun } from '#types/definitions/runs'
import { baselineRun, repairedRun, savedComparison } from '#utils/progress/index'

export interface UseRunComparisonResult {
  /** The active mission's saved baseline, if the player kept one. */
  readonly baseline: SavedRun | null
  /** The latest attempt that passed, else the latest attempt. */
  readonly repaired: SavedRun | null
  /** Both side by side, for the timeline and the debrief; `null` until there are both. */
  readonly comparison: RunComparison | null
}

export function useRunComparison(): UseRunComparisonResult {
  const mission = useProgressStore((state) => state.active?.mission ?? null)
  const progress = useProgressStore((state) => state.progress)

  return useMemo(
    () =>
      mission
        ? {
            baseline: baselineRun(progress, mission),
            repaired: repairedRun(progress, mission),
            comparison: savedComparison(progress, mission),
          }
        : { baseline: null, repaired: null, comparison: null },
    [mission, progress]
  )
}
