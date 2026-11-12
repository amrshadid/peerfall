import type { FlagBounds, MarkPoint, RoadPoint, RoadShape } from '@features/map/types'
import { HERE_FLAG, HERE_RING } from './here-flag.constants'

export interface HereFlagShape {
  /** The pin's triangle, tip at the stop's ring. */
  readonly pin: string
  readonly box: { readonly x: number; readonly y: number; readonly width: number; readonly height: number }
  readonly label: MarkPoint
}

/** Kept inside `bounds`; with no room above the stop it hangs below, pin pointing up. */
export function hereFlag(stop: MarkPoint, nodeSize: number, bounds: FlagBounds): HereFlagShape {
  const { width, height, pinWidth, pinHeight, gap, baseline, margin } = HERE_FLAG
  const reach = nodeSize / 2 + HERE_RING + gap
  const half = width / 2
  const x = Math.min(Math.max(stop.x, bounds.left + half + margin), bounds.right - half - margin)
  const above = stop.y - reach - pinHeight - height >= bounds.top
  const tip = above ? stop.y - reach : stop.y + reach
  const boxY = above ? tip - pinHeight - height : tip + pinHeight
  const pin = above
    ? `M${stop.x} ${tip} l${-pinWidth / 2} ${-pinHeight} h${pinWidth} z`
    : `M${stop.x} ${tip} l${-pinWidth / 2} ${pinHeight} h${pinWidth} z`
  return {
    pin,
    box: { x: x - half, y: boxY, width, height },
    label: { x, y: boxY + baseline },
  }
}

export function pathOf(points: readonly MarkPoint[]): string {
  return points.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x} ${point.y}`).join(' ')
}

/**
 * The road through `points`, split at point index `split` (the last one reached; 0 when none).
 * A stretch that arrives at a pencil point is never inked: nobody has travelled a stage with no missions.
 */
export function roadOf(points: readonly RoadPoint[], split: number): RoadShape {
  const paths = { reached: [] as string[], ahead: [] as string[] }
  let last: keyof typeof paths | null = null
  for (let index = 1; index < points.length; index += 1) {
    const from = points[index - 1]
    const to = points[index]
    if (!from || !to) {
      continue
    }
    const kind = index <= split && !to.pencil ? 'reached' : 'ahead'
    // A new sub-path wherever the pen changes, so each run keeps its mitred corners.
    paths[kind].push(kind === last ? `L${to.x} ${to.y}` : `M${from.x} ${from.y} L${to.x} ${to.y}`)
    last = kind
  }
  return { reached: paths.reached.join(' '), ahead: paths.ahead.join(' ') }
}
