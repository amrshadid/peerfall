/** The moments of an outage, in the order a recovery passes them. */
export const TIMELINE_MARK_KINDS = ['fault', 'detection', 'adjacency', 'route', 'probe'] as const

export type TimelineMarkKind = (typeof TIMELINE_MARK_KINDS)[number]

export interface TimelineMark {
  readonly kind: TimelineMarkKind
  /** Seconds after the fault; the fault itself is 0. */
  readonly atSeconds: number
  /** What happened, e.g. "BFD session down" or "OSPF dead timer expired". */
  readonly label: string
  /** Where and how, in FRR's own terms, e.g. "a: peer 10.0.2.2, control-expired". */
  readonly detail: string | null
}

/** One run of the fault: what happened when, and how long traffic was lost. */
export interface TimelineRun {
  /** "Baseline" or "Repaired": which run this is. */
  readonly label: string
  /** In time order, the fault first. */
  readonly marks: readonly TimelineMark[]
  /** From the fault to the first good probe, in seconds; null while traffic is still lost. */
  readonly outageSeconds: number | null
}

export interface TimelinePresentationProps {
  /** The run before the player's change; null until one was recorded. */
  baseline: TimelineRun | null
  /** The run after it; null until one was recorded. */
  repaired: TimelineRun | null
  /** The mission's recovery target in seconds, drawn on the axis and named in the text; null for none. */
  targetSeconds?: number | null
}

/** The axis both runs are drawn on. */
export interface TimelineAxis {
  /** Where the axis ends, in seconds: at or past the last mark. */
  readonly endSeconds: number
  /** Labelled ticks from 0 to the end, in seconds. */
  readonly ticks: readonly number[]
}
