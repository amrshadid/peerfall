import type { KernelRoute } from '@peerfall/machine/types'
import type { ObjectiveId } from '#types/definitions/mission'

/** The two things FRR can notice a dead neighbor by, under the names of the Machine's events. */
export const DETECTION_EVENTS = ['bfd_session_down', 'ospf_dead_timer_expired'] as const

export type DetectionEvent = (typeof DETECTION_EVENTS)[number]

/** Checks that read a run of the mission's probe and fault from the Machine's events. */
export const RUN_CHECK_KINDS = ['reachable', 'path', 'recovery', 'outage', 'detected-by'] as const

/** Checks that read the Machine as it is when the player's work is checked: no fault is needed. */
export const STATE_CHECK_KINDS = ['daemons', 'route', 'reaches', 'config'] as const

export const CHECK_KINDS = [...RUN_CHECK_KINDS, ...STATE_CHECK_KINDS] as const

export type CheckKind = (typeof CHECK_KINDS)[number]

export type StateCheckKind = (typeof STATE_CHECK_KINDS)[number]

/** Where a `config` check looks: what the router runs now, or the frr.conf it would start with. */
export const CONFIG_SOURCES = ['running', 'saved'] as const

export type ConfigSource = (typeof CONFIG_SOURCES)[number]

/** How many packets a `reaches` check sends. */
export const REACH_PACKETS = 3

/**
 * A mission's declared `check:` block. Every kind reads outcomes: the Machine's events, or the
 * Machine's state as root reads it. None of them can see which command was typed.
 */
export type CheckDefinition =
  | RunCheckDefinition
  /** These FRR daemons run on the router and answer vtysh. */
  | { readonly kind: 'daemons'; readonly router: string; readonly daemons: readonly string[] }
  /**
   * The router's kernel has a route: the one for exactly `prefix`, or the one it would use for
   * the address `to` (the longest prefix that covers it). One of the two is given. `protocol`,
   * `via` and `interface` narrow it when given: who installed it, its next hop, its way out.
   */
  | {
      readonly kind: 'route'
      readonly router: string
      readonly prefix?: string
      readonly to?: string
      readonly protocol?: string
      readonly via?: string
      readonly interface?: string
    }
  /** At least `minReplies` of the few packets sent from the router to the address are answered. */
  | { readonly kind: 'reaches'; readonly from: string; readonly to: string; readonly minReplies: number }
  /**
   * The router's configuration has a line inside the blocks of `block` (outermost first; none for
   * a top-level line). `line` is the whole line or its first words: `description` matches any
   * description, `ip address 10.0.1.1/30` only that address.
   */
  | {
      readonly kind: 'config'
      readonly router: string
      readonly source: ConfigSource
      readonly block: readonly string[]
      readonly line: string
    }

export type RunCheckDefinition =
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

/**
 * The limit of a `recovery` or `outage` check that states none in a mission with no recovery
 * target. The schema refuses such a mission; a definition built by hand never passes the check.
 */
export const NO_LIMIT_MS = 0

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
  /** The Machine's state hasn't been read yet: the player hasn't asked for their work to be checked. */
  notChecked: 'not_checked',
  /** A daemon the check names is not running, or does not answer. */
  daemonsDown: 'daemons_down',
  /** The kernel has a route there, but not from the protocol, next hop or interface asked for. */
  wrongRoute: 'wrong_route',
  /** The configuration does not have the line. */
  notConfigured: 'not_configured',
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
  | {
      readonly kind: 'daemons'
      readonly passed: boolean
      readonly failure: CheckFailure | null
      readonly router: string
      /** Every daemon that answered vtysh on the router. */
      readonly running: readonly string[]
      /** The daemons the check names that did not. */
      readonly missing: readonly string[]
    }
  | {
      readonly kind: 'route'
      readonly passed: boolean
      readonly failure: CheckFailure | null
      readonly router: string
      /** The kernel's route for the prefix or the address; `null` when it has none. */
      readonly route: KernelRoute | null
    }
  | {
      readonly kind: 'reaches'
      readonly passed: boolean
      readonly failure: CheckFailure | null
      readonly from: string
      readonly to: string
      readonly sent: number
      readonly received: number
    }
  | {
      readonly kind: 'config'
      readonly passed: boolean
      readonly failure: CheckFailure | null
      readonly router: string
      readonly source: ConfigSource
      /** The configuration's line that matched, as FRR wrote it; `null` when none did. */
      readonly found: string | null
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
