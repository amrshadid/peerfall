/** One router's FRR configuration, as a tab. */
export interface EditorFile {
  /** Names the file in callbacks and on its tab, e.g. `a/frr.conf`. */
  readonly path: string
  readonly content: string
  /** Files the player may read but not change (shown with a lock). */
  readonly readOnly?: boolean
}

export type ApplyState =
  | { readonly kind: 'idle' }
  /**
   * `reason` says why Apply is off, for its title and screen readers. `working` is true while the
   * routers are loading the configuration, as opposed to the Machine not being up yet.
   */
  | { readonly kind: 'busy'; readonly label: string; readonly reason: string; readonly working?: boolean }
