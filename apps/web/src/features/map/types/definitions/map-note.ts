import type { ChapterId } from '@peerfall/game/types'

/** What the pointer or the keyboard is on. */
export type MapNoteTarget =
  | { readonly kind: 'stop'; readonly key: string }
  | { readonly kind: 'region'; readonly key: string }
  | { readonly kind: 'chapter'; readonly id: ChapterId }

/** The note under the drawing: what the thing under the pointer or focus is. */
export interface MapNote {
  /** "4.1 · The Link That Never Went Down", "Notice it fast", "What this stage covers · Recover from failure". */
  readonly title: string
  readonly text: string
  /** "Next up", "About 25 min", "Traffic back within 2 s", "Guide: bfdd, zebra". */
  readonly facts: readonly string[]
}

/** Every note the map can show, by stop key, region key and stage. */
export interface MapNotes {
  readonly stops: ReadonlyMap<string, MapNote>
  readonly regions: ReadonlyMap<string, MapNote>
  readonly chapters: ReadonlyMap<ChapterId, MapNote>
}
