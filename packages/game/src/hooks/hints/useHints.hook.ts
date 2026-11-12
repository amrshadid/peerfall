import { eventBus } from '@peerfall/core/services'
import type { ServiceResponse } from '@peerfall/core/types'
import { useMemo } from 'react'
import { getGameNow } from '#config'
import type { HintRevealedPayload } from '#events/types'
import { GAME_EVENTS } from '#events/types'
import { announceProgress } from '#services/utils/announce-progress.service'
import { noActiveMissionError, noHintLeftError, unknownObjectiveError } from '#services/utils/error-handling.service'
import { useProgressStore } from '#store/progress.store'
import type { HintDefinition, ObjectiveDefinition, ObjectiveId } from '#types/definitions/mission'
import { hintsLeft, nextHint, revealedHints } from '#utils/hints/index'
import { findMissionProgress, revealNextHint } from '#utils/progress/index'

const SOURCE = 'game/hints'

/** An objective of the active mission with the hints shown for it so far. */
export interface ObjectiveHints {
  readonly objective: ObjectiveDefinition
  /** In order: where to look first, a specific command last. */
  readonly revealed: readonly HintDefinition[]
  readonly left: number
}

export interface UseHintsResult {
  /** One entry per objective of the active mission, in its order; empty when none is active. */
  readonly objectives: readonly ObjectiveHints[]
  /** Shows an objective's next hint. Hints cost nothing; how many were used is only recorded. */
  readonly reveal: (objectiveId: ObjectiveId) => Promise<ServiceResponse<HintDefinition>>
}

/** Reveals the next hint of one of the active mission's objectives, and saves that it was used. */
export async function revealHint(objectiveId: ObjectiveId): Promise<ServiceResponse<HintDefinition>> {
  const store = useProgressStore.getState
  const { active, progress } = store()
  if (!active) return noActiveMissionError()
  const { mission } = active
  const objective = mission.objectives.find((candidate) => candidate.id === objectiveId)
  if (!objective) return unknownObjectiveError(objectiveId)
  const shown = findMissionProgress(progress, mission.id)?.hintsRevealed[objectiveId] ?? 0
  const hint = nextHint(objective, shown)
  const revealed = revealNextHint(progress, mission, objectiveId)
  if (!hint || !revealed) return noHintLeftError(objectiveId)
  store().setProgress(revealed)
  eventBus.emit<HintRevealedPayload>(
    GAME_EVENTS.HINT_REVEALED,
    { missionId: mission.id, objectiveId, stage: shown + 1, at: getGameNow() },
    { source: SOURCE }
  )
  await announceProgress(SOURCE)
  return { success: true, data: hint }
}

export function useHints(): UseHintsResult {
  const active = useProgressStore((state) => state.active)
  const progress = useProgressStore((state) => state.progress)

  return useMemo(() => {
    const counts = active ? (findMissionProgress(progress, active.mission.id)?.hintsRevealed ?? {}) : {}
    return {
      objectives: (active?.mission.objectives ?? []).map((objective) => ({
        objective,
        revealed: revealedHints(objective, counts[objective.id] ?? 0),
        left: hintsLeft(objective, counts[objective.id] ?? 0),
      })),
      reveal: revealHint,
    }
  }, [active, progress])
}
