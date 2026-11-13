import { eventBus } from '@peerfall/core/services'
import type { ServiceResponse } from '@peerfall/core/types'
import { useMemo } from 'react'
import { getGameNow } from '#config'
import type { HintRevealedPayload } from '#events/types'
import { GAME_EVENTS } from '#events/types'
import { announceProgress } from '#services/utils/announce-progress.service'
import { noActiveMissionError, noHintLeftError } from '#services/utils/error-handling.service'
import { useProgressStore } from '#store/progress.store'
import type { HintTier, RevealedHint } from '#types/definitions/hints'
import { hintsLeft, nextHint, revealedHints } from '#utils/hints/index'
import { findMissionProgress, revealNextHint } from '#utils/progress/index'

const SOURCE = 'game/hints'

export interface UseHintsResult {
  /** The active mission's hints shown so far, in order: nudge, concept, spot. Empty when none is active. */
  readonly revealed: readonly RevealedHint[]
  /** The tier `reveal` shows next; `null` once all three are shown or no mission is active. */
  readonly next: HintTier | null
  readonly left: number
  /** Shows the next hint. Hints cost nothing; how many were used is only recorded. */
  readonly reveal: () => Promise<ServiceResponse<RevealedHint>>
}

/** Reveals the active mission's next hint, and saves that it was used. */
export async function revealHint(): Promise<ServiceResponse<RevealedHint>> {
  const store = useProgressStore.getState
  const { active, progress } = store()
  if (!active) return noActiveMissionError()
  const { mission } = active
  const shown = findMissionProgress(progress, mission.id)?.hintsRevealed ?? 0
  const hint = nextHint(mission, shown)
  const revealed = revealNextHint(progress, mission)
  if (!hint || !revealed) return noHintLeftError(mission.id)
  store().setProgress(revealed)
  eventBus.emit<HintRevealedPayload>(
    GAME_EVENTS.HINT_REVEALED,
    { missionId: mission.id, tier: hint.tier, stage: revealedHints(mission, shown).length + 1, at: getGameNow() },
    { source: SOURCE }
  )
  await announceProgress(SOURCE)
  return { success: true, data: hint }
}

export function useHints(): UseHintsResult {
  const active = useProgressStore((state) => state.active)
  const progress = useProgressStore((state) => state.progress)

  return useMemo(() => {
    if (!active) {
      return { revealed: [], next: null, left: 0, reveal: revealHint }
    }
    const shown = findMissionProgress(progress, active.mission.id)?.hintsRevealed ?? 0
    return {
      revealed: revealedHints(active.mission, shown),
      next: nextHint(active.mission, shown)?.tier ?? null,
      left: hintsLeft(active.mission, shown),
      reveal: revealHint,
    }
  }, [active, progress])
}
