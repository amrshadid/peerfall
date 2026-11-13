import type { MissionVerdict } from '#types/definitions/checks'
import type { ChapterDefinition, MissionDefinition, MissionId } from '#types/definitions/mission'
import type { SavedRun } from '#types/definitions/runs'

/** Milliseconds since the Unix epoch, from the injected clock. */
export type EpochMs = number

/** Everything saved about one mission the player has started. */
export interface MissionProgress {
  readonly missionId: MissionId
  readonly firstStartedAt: EpochMs
  /** First time its checks passed; replays don't move it. */
  readonly completedAt: EpochMs | null
  /** Judged runs so far. Retries are free: this is shown, never held against the player. */
  readonly attempts: number
  /** How many of the mission's three hints are revealed, from 0. */
  readonly hintsRevealed: number
  /** The baseline, if one was saved, and the latest attempts, oldest first. */
  readonly runs: readonly SavedRun[]
}

/** The player's whole progress. Plain JSON-safe data. */
export interface Progress {
  /** In the order the missions were first started. */
  readonly missions: readonly MissionProgress[]
  /** Mission ids in the order they were first completed. */
  readonly completionOrder: readonly MissionId[]
  /** Where "Continue" on the title screen takes the player. */
  readonly lastActive: MissionId | null
  /**
   * A debrief left open: the player reached it and has not left through one of its ways on, so
   * the mission opens at it again, as Kernelfall reopens a level at its card. Left out otherwise;
   * saves from before it was added load without it.
   */
  readonly debrief?: OpenDebrief
}

/** The mission whose debrief is open, and how its passing play-through was judged, for the Guide. */
export interface OpenDebrief {
  readonly missionId: MissionId
  /** `null` when the play-through left no verdict to show. */
  readonly verdict: MissionVerdict | null
}

export const MISSION_STATUSES = ['locked', 'available', 'in_progress', 'completed'] as const

/** `locked` until every prerequisite is completed. */
export type MissionStatus = (typeof MISSION_STATUSES)[number]

/** A mission as the mission list shows it. */
export interface MissionEntry {
  readonly mission: MissionDefinition
  readonly status: MissionStatus
  readonly attempts: number
  readonly hintsUsed: number
}

/** A chapter with its missions in play order; none yet for a stage that is still to come. */
export interface ChapterEntry {
  readonly chapter: ChapterDefinition
  readonly missions: readonly MissionEntry[]
}
