import { MIN_PLAY_WIDTH_PX, minWidthQuery, viewportStore } from '@features/small-screen/utils/viewport'
import { useMemo, useSyncExternalStore } from 'react'

export function useWideEnough(minWidthPx: number = MIN_PLAY_WIDTH_PX): boolean {
  const store = useMemo(
    () =>
      viewportStore(
        typeof window === 'undefined' || !window.matchMedia ? null : window.matchMedia(minWidthQuery(minWidthPx))
      ),
    [minWidthPx]
  )
  // Without a window (server snapshot) the game is assumed playable, like viewportStore without matchMedia.
  return useSyncExternalStore(store.subscribe, store.getSnapshot, () => true)
}
