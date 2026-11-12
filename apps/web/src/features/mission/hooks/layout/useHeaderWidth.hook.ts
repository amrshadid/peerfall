import { headerWidthRem } from '@features/mission/utils/layout'
import { useLayoutEffect, useState } from 'react'

/** The panel's width in rem that puts its divider under the header's right rule; null until laid out. */
export function useHeaderWidth(headerSelector: string, panelId: string): number | null {
  const [width, setWidth] = useState<number | null>(null)
  useLayoutEffect(() => {
    const header = document.querySelector(headerSelector)
    const panel = document.getElementById(panelId)
    if (!header || !panel) {
      return
    }
    const measure = () => {
      setWidth(
        headerWidthRem({
          headerRight: header.getBoundingClientRect().right,
          ruleWidth: Number.parseFloat(getComputedStyle(header).borderRightWidth) || 0,
          panelLeft: panel.getBoundingClientRect().left,
          remPx: Number.parseFloat(getComputedStyle(document.documentElement).fontSize),
        })
      )
    }
    measure()
    // Fonts and the UI scale resize the bar's items, and the header moves with anything before it.
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure)
    for (const sibling of header.parentElement?.children ?? []) {
      observer?.observe(sibling)
      if (sibling === header) {
        break
      }
    }
    window.addEventListener('resize', measure)
    return () => {
      observer?.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [headerSelector, panelId])
  return width
}
