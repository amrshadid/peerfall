import type { Route } from '@shared/types/definitions/route'
import { useEffect } from 'react'

// About a second at 60 fps: long enough for a lazy screen's chunk to render its heading.
const MAX_FOCUS_FRAMES = 60

/** On a new screen (or the window crossing the play width), focuses its h1 once it has rendered. */
export function useRouteFocus(route: Route, wide: boolean): void {
  const key = JSON.stringify({ route, wide })
  // biome-ignore lint/correctness/useExhaustiveDependencies: focus moves on every screen change
  useEffect(() => {
    let frame = 0
    let tries = 0
    const focusHeading = () => {
      const heading = document.querySelector<HTMLElement>('h1')
      if (heading) {
        heading.focus({ preventScroll: true })
      } else if (tries++ < MAX_FOCUS_FRAMES) {
        frame = requestAnimationFrame(focusHeading)
      }
    }
    focusHeading()
    return () => cancelAnimationFrame(frame)
  }, [key])
}
