import type { Detection, Outage, RouteHop } from '#types/definitions/checks'

/** The neighbor on the faulted link leaving Full, as ospfd logged it. */
export interface AdjacencyChange {
  readonly router: string
  readonly neighbor: string
  readonly interface: string
  readonly from: string
  readonly to: string
  /** FRR's name for what caused it: `InactivityTimer` for the dead timer and for a BFD-triggered drop alike. */
  readonly reason: string
  readonly atMs: number
  readonly afterFaultMs: number
}

/** The kernel starting to forward the probe's traffic another way. */
export interface RouteUpdate {
  readonly route: RouteHop
  readonly atMs: number
  readonly afterFaultMs: number
}

/** The first reply that came back over the updated route. */
export interface GoodProbe {
  readonly sequence: number
  readonly atMs: number
  readonly afterFaultMs: number
}

/**
 * What happened in one run, in the order it happens: the fault, what detected it, the adjacency
 * dropping, the route changing, traffic coming back. Small and JSON-safe, so it can be saved.
 */
export interface RunSummary {
  /** `null` until the fault is injected; then every later field is read from after it. */
  readonly faultAtMs: number | null
  /** The route in use when the link broke. */
  readonly pathBefore: RouteHop | null
  readonly detection: Detection | null
  readonly adjacencyChange: AdjacencyChange | null
  readonly routeUpdate: RouteUpdate | null
  readonly firstGoodProbe: GoodProbe | null
  readonly outage: Outage | null
  readonly repliesBeforeFault: number
  /** Packets that got no reply after the fault. */
  readonly probesLost: number
}

/** The moments of a run the timeline lines up, in order. */
export const RUN_STEPS = ['detection', 'adjacency', 'route', 'probe'] as const

export type RunStep = (typeof RUN_STEPS)[number]

/** One moment in both runs, as milliseconds after each run's own fault; `null` where it never came. */
export interface StepComparison {
  readonly step: RunStep
  readonly baselineMs: number | null
  readonly repairedMs: number | null
  /** How much sooner the repaired run got there; `null` unless both did. */
  readonly savedMs: number | null
}

/** A baseline run beside a repaired one, for the timeline and the debrief. */
export interface RunComparison {
  readonly baseline: RunSummary
  readonly repaired: RunSummary
  readonly steps: readonly StepComparison[]
  /** How much shorter the repaired run's outage was; `null` unless both runs recovered. */
  readonly outageSavedMs: number | null
  /** Whether something else noticed the fault first in the repaired run. */
  readonly detectorChanged: boolean
}

export const RUN_ROLES = ['baseline', 'attempt'] as const

/** A `baseline` shows the network failing as it was given; an `attempt` is judged. */
export type RunRole = (typeof RUN_ROLES)[number]

/** Attempts kept per mission; an older one is dropped for a newer. */
export const MAX_SAVED_ATTEMPTS = 5

/** A run as the save keeps it: its summary, not its events (a baseline is over a thousand of them). */
export interface SavedRun {
  readonly role: RunRole
  /** The mission's `version` when it ran: runs of another version aren't compared. */
  readonly missionVersion: number
  readonly savedAt: number
  /** Whether the mission's checks passed. Always false for a baseline, which isn't judged. */
  readonly passed: boolean
  readonly summary: RunSummary
}
