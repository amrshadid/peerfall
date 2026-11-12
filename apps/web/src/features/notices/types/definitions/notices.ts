export type NoticeKind = 'complete' | 'info' | 'save-failed'

export interface Notice {
  readonly id: string
  readonly kind: NoticeKind
  /** The stamp: "Mission passed", "Not saved". */
  readonly kicker: string
  readonly text: string
  /** A save failure stays until dismissed; the rest fade on their own. */
  readonly sticky: boolean
}
