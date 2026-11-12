import type { ObjectiveId } from '#types/definitions/mission'

/** The two things FRR can notice a dead neighbor by, under the names of the Machine's events. */
export const DETECTION_EVENTS = ['bfd_session_down', 'ospf_dead_timer_expired'] as const

export type DetectionEvent = (typeof DETECTION_EVENTS)[number]

export const CHECK_KINDS = ['reachable', 'path', 'recovery', 'outage', 'detected-by'] as const

export type CheckKind = (typeof CHECK_KINDS)[number]

/**
 * A mission's declared `check:` block. Every kind reads outcomes from the Machine's events:
 * none of them can see which command was typed.
 */
export type CheckDefinition =
  /** The probe gets replies before the fault. */
  | { readonly kind: 'reachable'; readonly minReplies: number }
  /**
   * The interface the probe's router forwards to the probe's destination through: `before` the
   * fault, and `after` traffic is back. At least one is given.
   */
  | { readonly kind: 'path'; readonly before?: string; readonly after?: string }
  /** Replies are back through `via` within `withinMs` of the fault (the mission's recovery target when left out). */
  | { readonly kind: 'recovery'; readonly via: string; readonly withinMs?: number }
  /** The longest gap between replies around the fault is at most `maxMs` (the recovery target when left out). */
  | { readonly kind: 'outage'; readonly maxMs?: number }
  /** What noticed the fault first, on the faulted link. */
  | { readonly kind: 'detected-by'; readonly event: DetectionEvent }

/**
 * A route change is stamped when the route monitor reads it, a reply when ping does, so the reply
 * a new route let through can carry a slightly earlier time than the route. A reply counts as
 * using a route that shows up within this long after it. Far shorter than any detection time, so
 * a reply already on its way when the link broke is never mistaken for recovery.
 */
export const ROUTE_STAMP_TOLERANCE_MS = 50

/** Why a check didn't pass, for the app to put into words. */
export const CHECK_FAILURES = {
  /** The fault hasn't been injected in this run, so there is nothing to judge yet. */
  noFault: 'no_fault',
  /** Too few replies before the fault. */
  unreachable: 'unreachable',
  /** No route to the probe's destination was seen when one was needed. */
  noRoute: 'no_route',
  wrongPath: 'wrong_path',
  /** Replies never came back through the expected interface. */
  notRecovered: 'not_recovered',
  tooSlow: 'too_slow',
  /** Neither BFD nor the dead timer reported the fault. */
  notDetected: 'not_detected',
  wrongDetector: 'wrong_detector',
} as const

export type CheckFailure = (typeof CHECK_FAILURES)[keyof typeof CHECK_FAILURES]

/** Where the kernel sends packets for a destination, from its `fib_install` events. */
export interface RouteHop {
  readonly prefix: string
  /** The first next hop's interface. */
  readonly interface: string
  /** The first next hop's address; `null` for a directly connected route. */
  readonly via: string | null
  /** Every next hop: more than one when equal-cost paths share the traffic. */
  readonly nextHops: readonly { readonly via: string | null; readonly interface: string }[]
  readonly protocol: string
  /** The Machine's clock when the kernel installed it. */
  readonly atMs: number
}

/** The longest stretch without a reply around the fault. */
export interface Outage {
  /** The last reply before the gap. */
  readonly fromMs: number
  /** The first reply after it; `null` while traffic is still down. */
  readonly toMs: number | null
  /** `null` while traffic is still down. */
  readonly durationMs: number | null
}

export interface Detection {
  readonly event: DetectionEvent
  readonly router: string
  readonly interface: string
  readonly atMs: number
  readonly afterFaultMs: number
}

/** The first reply after the fault that came back over the expected route. */
export interface Recovery {
  readonly sequence: number
  readonly atMs: number
  readonly afterFaultMs: number
  readonly route: RouteHop
}

/** What a check found. `failure` is `null` exactly when `passed`; the rest is the evidence it read. */
export type CheckResult =
  | {
      readonly kind: 'reachable'
      readonly passed: boolean
      readonly failure: CheckFailure | null
      readonly replies: number
    }
  | {
      readonly kind: 'path'
      readonly passed: boolean
      readonly failure: CheckFailure | null
      /** The route in use when the fault was injected. */
      readonly before: RouteHop | null
      /** The route the first reply after the fault's outage came back over. */
      readonly after: RouteHop | null
    }
  | {
      readonly kind: 'recovery'
      readonly passed: boolean
      readonly failure: CheckFailure | null
      readonly recovery: Recovery | null
      readonly limitMs: number
    }
  | {
      readonly kind: 'outage'
      readonly passed: boolean
      readonly failure: CheckFailure | null
      readonly outage: Outage | null
      readonly limitMs: number
    }
  | {
      readonly kind: 'detected-by'
      readonly passed: boolean
      readonly failure: CheckFailure | null
      readonly detection: Detection | null
    }

export interface ObjectiveVerdict {
  readonly objectiveId: ObjectiveId
  readonly result: CheckResult
}

/** A run judged against a mission: passed only when every objective's check did. */
export interface MissionVerdict {
  readonly passed: boolean
  /** In the mission's order. */
  readonly objectives: readonly ObjectiveVerdict[]
}
