import type { EditorFile } from './editor'

/** Read at call time, so the component can swap callbacks without rebuilding the editor. */
export interface EditorHandlers {
  onChange(path: string, content: string): void
  /** Mod+Enter in the editor. */
  onApply(): void
}

/** A mounted editor. Each file keeps its own state, so undo history survives tab switches. */
export interface EditorHandle {
  showFile(file: EditorFile): void
  focus(): void
  destroy(): void
}

/** What a run of characters in an FRR configuration is; `null` is plain text. */
export type FrrTokenKind = 'comment' | 'keyword' | 'number' | null

export interface FrrToken {
  /** Offsets in the line, end exclusive. */
  readonly from: number
  readonly to: number
  readonly kind: FrrTokenKind
}
