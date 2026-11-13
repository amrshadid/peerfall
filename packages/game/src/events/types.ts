import type { HintTier } from '#types/definitions/hints'
import type { MissionId } from '#types/definitions/mission'
import type { EpochMs } from '#types/definitions/progress'
import type { RunRole } from '#types/definitions/runs'
import type { SaveIssue } from '#types/definitions/saves'

export const GAME_EVENTS = {
  OPENED: 'GAME_OPENED',
  PROGRESS_CHANGED: 'GAME_PROGRESS_CHANGED',
  MISSION_STARTED: 'GAME_MISSION_STARTED',
  MISSION_COMPLETED: 'GAME_MISSION_COMPLETED',
  RUN_RECORDED: 'GAME_RUN_RECORDED',
  HINT_REVEALED: 'GAME_HINT_REVEALED',
  SAVED: 'GAME_SAVED',
  SAVE_FAILED: 'GAME_SAVE_FAILED',
  PROGRESS_RESET: 'GAME_PROGRESS_RESET',
} as const

export interface OpenedPayload {
  /** Null when the stored save was used as is; otherwise why progress isn't reaching storage. */
  saveIssue: SaveIssue | null
  at: EpochMs
}

/** Progress changed in a way worth keeping; the autosave listener writes it. */
export interface ProgressChangedPayload {
  at: EpochMs
}

export interface MissionStartedPayload {
  missionId: MissionId
  /** True when the mission had been started before. */
  resumed: boolean
  at: EpochMs
}

/** The mission's checks passed for the first time. */
export interface MissionCompletedPayload {
  missionId: MissionId
  /** Judged runs it took, this one included. */
  attempts: number
  hintsUsed: number
  at: EpochMs
}

/** A run was kept: a baseline, or an attempt with its verdict. */
export interface RunRecordedPayload {
  missionId: MissionId
  role: RunRole
  passed: boolean
  at: EpochMs
}

export interface HintRevealedPayload {
  missionId: MissionId
  tier: HintTier
  /** Which of the mission's three hints, from 1. */
  stage: number
  at: EpochMs
}

export interface SavedPayload {
  at: EpochMs
}

export interface SaveFailedPayload {
  issue: SaveIssue
  at: EpochMs
}

export interface ProgressResetPayload {
  at: EpochMs
}
