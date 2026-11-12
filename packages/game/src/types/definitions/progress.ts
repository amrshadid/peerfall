import type { ChapterDefinition, MissionDefinition, MissionId, ObjectiveId } from '#types/definitions/mission'
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
  /** How many hints are revealed for each objective that has any revealed. */
  readonly hintsRevealed: Readonly<Record<ObjectiveId, number>>
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
