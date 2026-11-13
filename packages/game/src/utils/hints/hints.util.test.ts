import { describe, expect, it } from 'vitest'
import { EXAMPLE_MISSION } from '#test/index'
import { hintsLeft, hintsUsed, nextHint, revealedHints } from '#utils/hints/hints.util'

describe('a mission’s three hints', () => {
  it('shows them in order, nudge, concept, spot, and only the spot names a command', () => {
    expect(revealedHints(EXAMPLE_MISSION, 0)).toEqual([])
    expect(revealedHints(EXAMPLE_MISSION, 2).map((hint) => hint.tier)).toEqual(['nudge', 'concept'])
    expect(revealedHints(EXAMPLE_MISSION, 2).some((hint) => hint.command !== undefined)).toBe(false)
    expect(revealedHints(EXAMPLE_MISSION, 3).at(-1)).toEqual({
      tier: 'spot',
      text: 'Turn on BFD for OSPF on both ends of the link.',
      command: 'ip ospf bfd',
    })
  })

  it('gives the next hint until none is left', () => {
    expect(nextHint(EXAMPLE_MISSION, 0)?.tier).toBe('nudge')
    expect(nextHint(EXAMPLE_MISSION, 2)?.tier).toBe('spot')
    expect(nextHint(EXAMPLE_MISSION, 3)).toBeNull()
    expect([0, 1, 3].map((revealed) => hintsLeft(EXAMPLE_MISSION, revealed))).toEqual([3, 2, 0])
  })

  it('survives a saved count out of range', () => {
    expect(revealedHints(EXAMPLE_MISSION, 9)).toHaveLength(3)
    expect(nextHint(EXAMPLE_MISSION, 9)).toBeNull()
    expect(hintsLeft(EXAMPLE_MISSION, -1)).toBe(3)
    expect(hintsUsed(EXAMPLE_MISSION, 9)).toBe(3)
    expect(hintsUsed(EXAMPLE_MISSION, -2)).toBe(0)
  })
})
