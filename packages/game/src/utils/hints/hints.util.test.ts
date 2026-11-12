import { describe, expect, it } from 'vitest'
import { EXAMPLE_MISSION } from '#test/index'
import type { ObjectiveDefinition } from '#types/definitions/mission'
import { hintsLeft, hintsUsed, nextHint, revealedHints } from '#utils/hints/hints.util'

const OBJECTIVE = EXAMPLE_MISSION.objectives.find(
  (objective) => objective.id === 'recovers-through-b'
) as ObjectiveDefinition

describe('staged hints', () => {
  it('shows hints in order: where to look first, a specific command last', () => {
    expect(revealedHints(OBJECTIVE, 0)).toEqual([])
    expect(revealedHints(OBJECTIVE, 2)).toEqual(OBJECTIVE.hints.slice(0, 2))
    expect(revealedHints(OBJECTIVE, 2).some((hint) => hint.command !== undefined)).toBe(false)
    expect(revealedHints(OBJECTIVE, 3).at(-1)?.command).toBe('ip ospf bfd')
  })

  it('gives the next hint until none is left', () => {
    expect(nextHint(OBJECTIVE, 0)).toBe(OBJECTIVE.hints[0])
    expect(nextHint(OBJECTIVE, 2)).toBe(OBJECTIVE.hints[2])
    expect(nextHint(OBJECTIVE, 3)).toBeNull()
    expect([0, 1, 3].map((revealed) => hintsLeft(OBJECTIVE, revealed))).toEqual([3, 2, 0])
  })

  it('survives a saved count the objective no longer has hints for', () => {
    expect(revealedHints(OBJECTIVE, 9)).toEqual(OBJECTIVE.hints)
    expect(nextHint(OBJECTIVE, 9)).toBeNull()
    expect(hintsLeft(OBJECTIVE, -1)).toBe(3)
  })

  it("counts a mission's hints used over its objectives, ignoring objectives it no longer has", () => {
    expect(hintsUsed(EXAMPLE_MISSION, {})).toBe(0)
    expect(hintsUsed(EXAMPLE_MISSION, { 'reaches-c': 1, 'recovers-through-b': 9, removed: 4 })).toBe(4)
  })
})
