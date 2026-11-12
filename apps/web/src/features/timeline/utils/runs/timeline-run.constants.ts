import type { TimelineMarkKind } from '@features/timeline/types'

export const MS_PER_SECOND = 1000

/** One letter per moment, printed on its mark and beside its row, so a mark is never told by its place alone. */
export const MARK_LETTERS: Readonly<Record<TimelineMarkKind, string>> = {
  fault: 'F',
  detection: 'D',
  adjacency: 'A',
  route: 'R',
  probe: 'P',
}

/** What each moment is, for a player who has not met the term yet. */
export const MARK_MEANINGS: Readonly<Record<TimelineMarkKind, string>> = {
  fault: 'Fault',
  detection: 'Detection',
  adjacency: 'Adjacency change',
  route: 'Route update',
  probe: 'First good probe',
}

/** Each moment in plain words, said once under the runs for a player meeting the terms here. */
export const MARK_EXPLANATIONS: Readonly<Record<TimelineMarkKind, string>> = {
  fault: 'The game makes the link lose every packet. Its interfaces stay up, so nothing tells the routers.',
  detection:
    "A router notices its neighbor is gone. OSPF's dead timer waits the whole dead interval (40 seconds by default) without a hello; BFD, when it runs on both ends, checks the link several times a second.",
  adjacency:
    'OSPF stops treating the two routers as neighbors. Every router then works out its routes again without that link.',
  route:
    'The Linux kernel, which is what forwards packets, gets the new route. Traffic can only move once it is there.',
  probe: 'The first probe packet that is answered again: the outage ends here.',
}

/** What noticed the fault, as the timeline names it. */
export const DETECTION_LABELS = {
  bfd_session_down: 'BFD session down',
  ospf_dead_timer_expired: 'OSPF dead timer expired',
} as const

/** A run that is still being measured. */
export const LIVE_RUN_LABEL = 'This run'

/** Steps an axis may count in, in seconds: the smallest that keeps the labels apart is used. */
export const AXIS_STEPS = [0.1, 0.2, 0.25, 0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300, 600] as const

/** More labelled ticks than this would crowd a dock a few hundred pixels wide. */
export const MAX_AXIS_TICKS = 6

/** An axis with nothing on it still shows a second, so the lanes have a scale. */
export const EMPTY_AXIS_SECONDS = 1

export const RUN_LABELS = { baseline: 'Baseline', repaired: 'Repaired' } as const
