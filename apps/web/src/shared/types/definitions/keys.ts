/** A key combination by `KeyboardEvent.code`, so Alt combos work on macOS where Option types symbols. */
export interface KeyBinding {
  readonly code: string
  /** Cmd on macOS, Ctrl elsewhere. */
  readonly mod?: boolean
  readonly alt?: boolean
  readonly shift?: boolean
}

/** The fields of a `KeyboardEvent` a shortcut is matched on. */
export interface KeyPress {
  readonly code: string
  readonly key: string
  readonly metaKey: boolean
  readonly ctrlKey: boolean
  readonly altKey: boolean
  readonly shiftKey: boolean
}
