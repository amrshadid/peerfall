import { HINT_TIERS, type RevealedHint } from '#types/definitions/hints'
import type { MissionDefinition } from '#types/definitions/mission'

/** Guards against a saved count beyond the hints the mission has now. */
const clamp = (mission: MissionDefinition, revealed: number): number =>
  Math.max(0, Math.min(revealed, mission.hints.length, HINT_TIERS.length))

function asRevealed(mission: MissionDefinition, at: number): RevealedHint | null {
  const hint = mission.hints[at]
  const tier = HINT_TIERS[at]
  if (!hint || !tier) {
    return null
  }
  return { tier, text: hint.text, ...(hint.command !== undefined && { command: hint.command }) }
}

/** The hints shown so far, in order: the nudge, the concept, the spot. */
export function revealedHints(mission: MissionDefinition, revealed: number): readonly RevealedHint[] {
  return Array.from({ length: clamp(mission, revealed) }, (_, at) => asRevealed(mission, at)).filter(
    (hint): hint is RevealedHint => hint !== null
  )
}

/** The hint revealed next, given how many are already shown; `null` once all are. */
export function nextHint(mission: MissionDefinition, revealed: number): RevealedHint | null {
  return asRevealed(mission, clamp(mission, revealed))
}

export function hintsLeft(mission: MissionDefinition, revealed: number): number {
  return Math.min(mission.hints.length, HINT_TIERS.length) - clamp(mission, revealed)
}

/** How many hints a mission has revealed, from the saved count. */
export function hintsUsed(mission: MissionDefinition, revealed: number): number {
  return clamp(mission, revealed)
}
