import type { MissionId } from '@peerfall/game/types'
import type { VocabularyRule } from '#types/definitions/lint'

/** The guided steps of a story and their word budgets; the real-world card has none. */
export const STEP_WORD_BUDGETS: Readonly<Record<string, number>> = {
  scene: 80,
  'see-it': 200,
  'build-it': 150,
  'watch-it': 120,
  debrief: 50,
}

export const STORY_WORD_BUDGET = { min: 500, max: 650 } as const

export const CODEX_WORD_BUDGETS = { simple: 25, deep: 80 } as const

export const ASIDE_BUDGET = 0

// What happens off the network, and hedges: matched case-insensitively, as whole words. The
// Machine is real Linux running real FRR, so a story never calls it a simulation.
export const BANNED_PHRASES: readonly string[] = [
  'the game',
  'emulator',
  'emulated',
  'simulated',
  'simulation',
  'the VM',
  'your numbers will differ',
  'your numbers may differ',
  'yours will differ',
  'next release',
]

// One meaning per picture word. Empty until the stories settle their pictures.
export const VOCABULARY: readonly VocabularyRule[] = []

// Rewritten to the standard: their budgets fail the tests; the others only warn.
export const ENFORCED_MISSIONS: readonly MissionId[] = []
