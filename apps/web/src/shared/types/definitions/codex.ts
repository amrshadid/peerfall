/** A card of the same `deepens` chain, linked both ways; a card not found yet shows only its mission number. */
export interface CodexCardLink {
  readonly term: string | null
  readonly href: string | null
  /** `1.2`. */
  readonly missionNumber: string
}

/** A Codex card as it is read: the term, in plain words, then FRR's side of it. */
export interface CodexCardData {
  readonly id: string
  readonly term: string
  /** Plain words, 25 at most. */
  readonly simple: string
  /** FRR's side: daemons, functions, files; null for a card without one. */
  readonly deep: string | null
  /** Each path in FRR's source tree with its link to the pinned release on GitHub. */
  readonly sources: readonly { readonly path: string; readonly href: string }[]
  readonly docs: string | null
  readonly tryIt: string | null
  /** The earlier card this one adds to. */
  readonly deepens: CodexCardLink | null
  /** The later cards that add to this one, in play order. */
  readonly deepenedBy: readonly CodexCardLink[]
  /** "1.3 The Silent Router": the mission that files it. */
  readonly filedIn: string
}
