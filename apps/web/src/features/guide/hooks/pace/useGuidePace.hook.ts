import type { GuidePace } from '@features/guide/types'
import { useCallback, useState } from 'react'

interface PaceState {
  readonly key: string
  readonly shown: number
  readonly picks: GuidePace['picks']
}

const startOf = (key: string): PaceState => ({ key, shown: 1, picks: {} })

/**
 * How far into a step's transcript the player is. `advance` shows the next beat (or `steps` more):
 * the screen calls it for each command the player finishes that the beat asked for, and Continue
 * calls it too, so the explanation of a result comes after the result. `key` names the step and
 * the play-through; a new one starts over.
 */
export function useGuidePace(key: string): GuidePace {
  const [pace, setPace] = useState<PaceState>(() => startOf(key))
  const current = pace.key === key ? pace : startOf(key)
  const advance = useCallback(
    (steps = 1) =>
      setPace((previous) => {
        const from = previous.key === key ? previous : startOf(key)
        return { ...from, shown: from.shown + steps }
      }),
    [key]
  )
  // Commands run while a question waited don't count: the answer shows one beat, not all of them.
  const pick = useCallback<GuidePace['pick']>(
    (predict, option, shown) =>
      setPace((previous) => {
        const from = previous.key === key ? previous : startOf(key)
        return { key, shown, picks: { ...from.picks, [predict]: option } }
      }),
    [key]
  )
  return { shown: current.shown, picks: current.picks, advance, pick }
}
