import type { RailMode } from '@shared/types'
import { railModeFor } from '@shared/utils/steps'
import { type RefObject, useLayoutEffect, useState } from 'react'

const widthOf = (element: HTMLElement) => element.getBoundingClientRect().width

/** Measures the rail's room against hidden full and current-only copies, so labels drop only when they would overlap. */
export function useRailMode(
  rail: RefObject<HTMLElement | null>,
  full: RefObject<HTMLElement | null>,
  current: RefObject<HTMLElement | null>
): RailMode {
  const [mode, setMode] = useState<RailMode>('full')
  useLayoutEffect(() => {
    const railEl = rail.current
    const fullEl = full.current
    const currentEl = current.current
    if (!railEl || !fullEl || !currentEl || typeof ResizeObserver === 'undefined') {
      return
    }
    const measure = () =>
      setMode(railModeFor({ available: widthOf(railEl), full: widthOf(fullEl), current: widthOf(currentEl) }))
    measure()
    // The copies resize with fonts, the UI scale and the current step; the rail with the bar.
    const observer = new ResizeObserver(measure)
    for (const element of [railEl, fullEl, currentEl]) {
      observer.observe(element)
    }
    return () => observer.disconnect()
  }, [rail, full, current])
  return mode
}
