import type { StringRule } from '@peerfall/core/types'
import type { LinkName, NetworkDefinition, ProbeDefinition } from '@peerfall/machine/types'
import type { CheckDefinition } from '#types/definitions/checks'

export type MissionId = string
export type ChapterId = string
export type ObjectiveId = string

/** Ids never change when folders are renumbered, so they carry no number. */
export const KEBAB_ID: StringRule = {
  pattern: /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/,
  expected: 'a kebab-case id like recover-from-failure',
}

/** A stage of the curriculum, as `chapters.yaml` lists it. */
export interface ChapterDefinition {
  readonly id: ChapterId
  /** Its place in the curriculum, from 1: the order of `chapters.yaml`. */
  readonly stage: number
  readonly title: string
  readonly summary: string
}

/** One step of help. Hints are staged: where to look first, a specific command last. */
export interface HintDefinition {
  readonly text: string
  /** What to type, on the hints that name it. The last hint of an objective always does. */
  readonly command?: string
}

/** An objective needs at least this many hints, so the first is never the answer. */
export const MIN_HINTS = 2

/** One outcome the player has to bring about, judged from the Machine's events or its state by its `check`. */
export interface ObjectiveDefinition {
  readonly id: ObjectiveId
  readonly text: string
  readonly check: CheckDefinition
  readonly hints: readonly HintDefinition[]
}

/** The link that stops passing packets, both ways, while its interfaces stay up. */
export interface FaultDefinition {
  /** Its two routers, in the order the network's link gives them. */
  readonly link: LinkName
}

/** The bounds of a probe's interval: fast enough to measure a sub-second outage, slow enough for the Machine. */
export const PROBE_INTERVAL_MS = { min: 10, max: 10_000 } as const

/** A parsed and validated `mission.yaml`. */
export interface MissionDefinition {
  readonly id: MissionId
  /** Goes up when the mission changes in a way that makes saved runs incomparable. */
  readonly version: number
  readonly title: string
  readonly chapter: ChapterId
  /** The whole mission in one sentence. */
  readonly objective: string
  /** Missions that must be completed first. */
  readonly prerequisites: readonly MissionId[]
  readonly network: NetworkDefinition
  /** Left out by a mission that breaks nothing: its checks read the Machine's state instead of a fault run. */
  readonly fault?: FaultDefinition
  /** Left out by a mission with no traffic to watch. */
  readonly probe?: ProbeDefinition
  /** Traffic must be back within this long after the fault, unless a check states its own limit. */
  readonly recoveryTargetMs?: number
  /**
   * Routers whose FRR is restarted, from its saved frr.conf, just before the player's work is
   * checked: what is judged is what survives a restart. Each is started by `watchfrr` or `none`.
   */
  readonly restartOnCheck?: readonly string[]
  /** In the order the player meets them. */
  readonly objectives: readonly ObjectiveDefinition[]
}

/** What the checks and the run summary need to know about a mission to read its events. */
export type RunContext = Pick<MissionDefinition, 'probe' | 'fault' | 'recoveryTargetMs'>
