import type { ScrollFrame } from '@features/map/types'
import { useCallback, useLayoutEffect, useRef, useState } from 'react'

export interface MapScroller {
  readonly ref: (element: HTMLDivElement | null) => void
  readonly element: HTMLDivElement | null
  /** Inner width: the drawing is laid out at exactly this width. */
  readonly width: number
  readonly view: number
  /** Read live, never state, so scrolling never renders. */
  read(): ScrollFrame
  /** Scrolls so drawing height `y` sits at `at` (0 top, 0.5 middle) of the view. */
  scrollTo(y: number, smooth: boolean, at?: number): void
}

interface Box {
  readonly width: number
  readonly view: number
}

const NOWHERE: ScrollFrame = { top: 0, view: 0 }

// Size is state, since a resize lays the drawing out again; the scroll offset goes to `onFrame`
// once a frame instead, so what follows the scroll is painted without a React render.
export function useMapScroller(onFrame?: (frame: ScrollFrame) => void): MapScroller {
  const [element, setElement] = useState<HTMLDivElement | null>(null)
  const [box, setBox] = useState<Box>({ width: 0, view: 0 })
  // A ref, so a new listener never re-subscribes the scroll handler.
  const frameListener = useRef(onFrame)
  useLayoutEffect(() => {
    frameListener.current = onFrame
  })

  useLayoutEffect(() => {
    if (!element) {
      return
    }
    const measure = () =>
      setBox((previous) =>
        previous.width === element.clientWidth && previous.view === element.clientHeight
          ? previous
          : { width: element.clientWidth, view: element.clientHeight }
      )
    const paint = () => frameListener.current?.({ top: element.scrollTop, view: element.clientHeight })
    measure()
    let frame = 0
    // One paint per frame however many scroll events the browser sends.
    const onScroll = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(paint)
    }
    const observer = new ResizeObserver(() => {
      measure()
      paint()
    })
    observer.observe(element)
    element.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      element.removeEventListener('scroll', onScroll)
    }
  }, [element])

  const read = useCallback(
    (): ScrollFrame => (element ? { top: element.scrollTop, view: element.clientHeight } : NOWHERE),
    [element]
  )

  const scrollTo = useCallback(
    (y: number, smooth: boolean, at = 0.5) => {
      if (element) {
        const top = Math.max(0, Math.round(y - element.clientHeight * at))
        element.scrollTo({ top, behavior: smooth ? 'smooth' : 'instant' })
      }
    },
    [element]
  )

  return { ref: setElement, element, ...box, read, scrollTo }
}
