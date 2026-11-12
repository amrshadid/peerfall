import { useProgressStore } from '#store/progress.store'
import type { MissionVerdict } from '#types/definitions/checks'
import type { MissionDefinition } from '#types/definitions/mission'
import type { MissionProgress } from '#types/definitions/progress'
import type { MissionPhase } from '#types/definitions/store'
import { findMissionProgress } from '#utils/progress/index'

export interface UseActiveMissionResult {
  /** `null` when no mission is being played. */
  readonly mission: MissionDefinition | null
  readonly phase: MissionPhase | null
  /** How the latest attempt was judged, objective by objective. */
  readonly verdict: MissionVerdict | null
  /** What is saved about it: attempts, hints revealed, runs. */
  readonly record: MissionProgress | null
  readonly isCompleted: boolean
}

export function useActiveMission(): UseActiveMissionResult {
  const active = useProgressStore((state) => state.active)
  const progress = useProgressStore((state) => state.progress)
  const record = active ? (findMissionProgress(progress, active.mission.id) ?? null) : null

  return {
    mission: active?.mission ?? null,
    phase: active?.phase ?? null,
    verdict: active?.verdict ?? null,
    record,
    isCompleted: record?.completedAt != null,
  }
}
