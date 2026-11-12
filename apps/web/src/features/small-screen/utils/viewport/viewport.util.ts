/** The part of `MediaQueryList` the viewport store needs (fakeable in tests). */
export interface MediaQuery {
  readonly matches: boolean
  addEventListener(type: 'change', listener: () => void): void
  removeEventListener(type: 'change', listener: () => void): void
}

export interface ViewportStore {
  subscribe(onChange: () => void): () => void
  getSnapshot(): boolean
}

/** `(min-width: 1024px)`: true while the viewport is at least `px` CSS pixels wide. */
export function minWidthQuery(px: number): string {
  return `(min-width: ${px}px)`
}

/** Without `matchMedia` it reports wide, so the game is never locked away by mistake. */
export function viewportStore(media: MediaQuery | null): ViewportStore {
  return {
    subscribe(onChange) {
      media?.addEventListener('change', onChange)
      return () => media?.removeEventListener('change', onChange)
    },
    getSnapshot: () => media?.matches ?? true,
  }
}
