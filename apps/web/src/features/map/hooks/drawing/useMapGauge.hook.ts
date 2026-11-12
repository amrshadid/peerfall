import type {
  GaugeSegment,
  GaugeStage,
  JourneyChapter,
  MapScene,
  SceneStop,
  ScrollFrame,
  StageSpan,
} from '@features/map/types'
import {
  ACTIVE_AT,
  gaugeAt,
  gaugeSegments,
  gaugeStagesOf,
  gaugeWindow,
  HERE_AT,
  KEEP_IN_VIEW_BOTTOM,
  KEEP_IN_VIEW_TOP,
  layoutMap,
  stageAt,
} from '@features/map/utils/layout'
import type { ChapterId } from '@peerfall/game/types'
import { type RefObject, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useMapScroller } from './useMapScroller.hook'

export interface UseMapGaugeResult {
  readonly scrollerRef: (element: HTMLDivElement | null) => void
  /** null until the scroller has a width to lay the drawing out at. */
  readonly scene: MapScene | null
  /** Moved through `--view-start`/`--view-size`, so scrolling never renders. */
  readonly viewBar: RefObject<HTMLSpanElement | null>
  readonly active: ChapterId | null
  readonly gaugeStages: readonly GaugeStage[]
  /** "You are here" as a fraction of the gauge; null when nowhere. */
  readonly here: number | null
  readonly jumpTo: (id: ChapterId) => void
  readonly findHere: () => void
  readonly keepInView: (stop: SceneStop) => void
}

// Scrolling paints the gauge straight from the scroll; only a change of stage in view renders.
export function useMapGauge(chapters: readonly JourneyChapter[], reducedMotion: boolean): UseMapGaugeResult {
  const viewBar = useRef<HTMLSpanElement>(null)
  const [active, setActive] = useState<ChapterId | null>(null)

  // A ref, so `paint` stays stable and the scroll handler is never re-subscribed.
  const gauge = useRef<{ spans: readonly StageSpan[]; segments: readonly GaugeSegment[] } | null>(null)
  const paint = useCallback(({ top, view }: ScrollFrame) => {
    const laidOut = gauge.current
    if (!laidOut || view === 0) {
      return
    }
    const shown = gaugeWindow(top, view, laidOut.spans, laidOut.segments)
    viewBar.current?.style.setProperty('--view-start', String(shown.start))
    viewBar.current?.style.setProperty('--view-size', String(shown.size))
    // Same stage, same state: React skips the render.
    setActive(stageAt(top + view * ACTIVE_AT, laidOut.spans))
  }, [])

  const { ref: scrollerRef, scrollTo, read, width, view } = useMapScroller(paint)
  // Laid out at the scroller's own width so text is drawn at its real size.
  const scene = useMemo(() => (width > 0 ? layoutMap(chapters, width) : null), [chapters, width])
  const segments = useMemo(() => (scene ? gaugeSegments(scene.chapters) : []), [scene])

  // A new layout moves every mark: repaint before the browser shows it.
  useLayoutEffect(() => {
    gauge.current = scene ? { spans: scene.chapters, segments } : null
    paint(read())
  }, [scene, segments, paint, read])

  const arrived = useRef(false)
  const smooth = !reducedMotion
  const hereY = scene?.here?.y ?? null
  useEffect(() => {
    if (hereY !== null && !arrived.current && view > 0) {
      arrived.current = true
      scrollTo(hereY, smooth, HERE_AT)
    }
  }, [hereY, view, scrollTo, smooth])

  const gaugeStages = useMemo(() => gaugeStagesOf(chapters, segments), [chapters, segments])
  const here = scene?.here ? gaugeAt(scene.here.y, scene.chapters, segments) : null

  // Stable, so the memoized drawing skips the gauge's and the note's renders.
  const keepInView = useCallback(
    (stop: SceneStop) => {
      const { top, view: height } = read()
      if (stop.y - KEEP_IN_VIEW_TOP < top || stop.y + KEEP_IN_VIEW_BOTTOM > top + height) {
        scrollTo(stop.y, smooth, HERE_AT)
      }
    },
    [read, scrollTo, smooth]
  )

  const jumpTo = (id: ChapterId) => {
    const chapter = scene?.chapters.find((candidate) => candidate.id === id)
    if (chapter) {
      scrollTo(chapter.top, smooth, 0)
    }
  }

  const findHere = () => {
    if (scene?.here) {
      scrollTo(scene.here.y, smooth, HERE_AT)
    }
  }

  return {
    scrollerRef,
    scene,
    viewBar,
    active,
    gaugeStages,
    here,
    jumpTo,
    findHere,
    keepInView,
  }
}
