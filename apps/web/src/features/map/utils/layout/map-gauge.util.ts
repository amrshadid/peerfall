import type { GaugeSegment, GaugeStage, JourneyChapter, StageSpan } from '@features/map/types'
import type { ChapterId } from '@peerfall/game/types'
import { GAUGE_SETTLE_PASSES, MIN_GAUGE_SHARE, MIN_VIEW_SHARE } from './map-gauge.constants'

/** The part of the drawing in view, as fractions of the gauge's height. */
export interface GaugeWindow {
  readonly start: number
  readonly size: number
}

export function gaugeStagesOf(
  chapters: readonly JourneyChapter[],
  segments: readonly GaugeSegment[]
): readonly GaugeStage[] {
  return chapters.map((chapter, index) => ({
    id: chapter.id,
    stage: chapter.stage,
    name: chapter.name,
    count: chapter.planned ? 'planned' : `${chapter.done}/${chapter.total}`,
    label: `Stage ${chapter.stage}, ${chapter.name}, ${chapter.progress}`,
    tone: chapter.tone,
    start: segments[index]?.start ?? 0,
    size: segments[index]?.size ?? 0,
  }))
}

/** The stage gauge: each stage's share of the drawing's height, but never less than `minShare`. */
export function gaugeSegments(stages: readonly StageSpan[], minShare = MIN_GAUGE_SHARE): readonly GaugeSegment[] {
  const heights = stages.map((stage) => Math.max(0, stage.bottom - stage.top))
  const total = heights.reduce((sum, height) => sum + height, 0) || 1
  let shares = heights.map((height) => height / total)
  // Raise the small ones to the minimum and shrink the rest to fit.
  for (let pass = 0; pass < GAUGE_SETTLE_PASSES; pass += 1) {
    const small = shares.map((share) => share <= minShare)
    const fixed = small.filter(Boolean).length * minShare
    const rest = shares.reduce((sum, share, index) => (small[index] ? sum : sum + share), 0) || 1
    shares = shares.map((share, index) => (small[index] ? minShare : (share / rest) * (1 - fixed)))
  }
  let start = 0
  return stages.map((stage, index) => {
    const size = shares[index] ?? 0
    const segment = { id: stage.id, start, size }
    start += size
    return segment
  })
}

/** Where drawing height `y` falls on the gauge, as a fraction from its top. */
export function gaugeAt(y: number, stages: readonly StageSpan[], segments: readonly GaugeSegment[]): number {
  const index = stages.findIndex((stage) => y < stage.bottom)
  const at = index === -1 ? stages.length - 1 : index
  const stage = stages[at]
  const segment = segments[at]
  if (!stage || !segment) {
    return 0
  }
  const within = Math.min(1, Math.max(0, (y - stage.top) / Math.max(1, stage.bottom - stage.top)))
  return Math.min(1, Math.max(0, segment.start + segment.size * within))
}

/** The part of the drawing in view, on the gauge; at least `minSize`, so it stays visible on a tall drawing. */
export function gaugeWindow(
  top: number,
  view: number,
  stages: readonly StageSpan[],
  segments: readonly GaugeSegment[],
  minSize = MIN_VIEW_SHARE
): GaugeWindow {
  const height = stages[stages.length - 1]?.bottom ?? 0
  const start = gaugeAt(top, stages, segments)
  const size = Math.max(minSize, gaugeAt(Math.min(height, top + view), stages, segments) - start)
  return { start: Math.min(start, 1 - size), size }
}

export function stageAt(y: number, stages: readonly StageSpan[]): ChapterId | null {
  return stages.find((stage) => y >= stage.top && y < stage.bottom)?.id ?? stages[stages.length - 1]?.id ?? null
}
