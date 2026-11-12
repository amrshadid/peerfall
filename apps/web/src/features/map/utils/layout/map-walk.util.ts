import type { SceneStop } from '@features/map/types'
import type { ChapterId } from '@peerfall/game/types'

type WalkStop = Pick<SceneStop, 'chapterId'>

/** The first stop of the nearest stage that has stops, `step` stages on; the stop itself when there is none. */
function stageStart(index: number, step: number, stops: readonly WalkStop[], stages: readonly ChapterId[]): number {
  const from = stages.indexOf(stops[index]?.chapterId ?? '')
  for (let at = from + step; at >= 0 && at < stages.length; at += step) {
    const first = stops.findIndex((candidate) => candidate.chapterId === stages[at])
    if (first !== -1) {
      return first
    }
  }
  return index
}

/**
 * Where a key takes the focus from the stop at `index`, as an index into `stops` (in travel order):
 * arrows walk the road, Home and End go to its ends, Page Up and Page Down change stage, skipping
 * stages with no missions. null for a key that doesn't walk.
 */
export function walkTarget(
  key: string,
  index: number,
  stops: readonly WalkStop[],
  stages: readonly ChapterId[]
): number | null {
  const last = stops.length - 1
  switch (key) {
    case 'ArrowDown':
    case 'ArrowRight':
      return Math.min(index + 1, last)
    case 'ArrowUp':
    case 'ArrowLeft':
      return Math.max(index - 1, 0)
    case 'Home':
      return 0
    case 'End':
      return last
    case 'PageDown':
      return stageStart(index, 1, stops, stages)
    case 'PageUp':
      return stageStart(index, -1, stops, stages)
    default:
      return null
  }
}
