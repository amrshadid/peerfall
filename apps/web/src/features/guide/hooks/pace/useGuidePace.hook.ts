import type { GuidePace } from '@features/guide/types'
import { useCallback, useState } from 'react'

interface PaceState {
  readonly key: string
  readonly shown: number
  readonly picks: GuidePace['picks']
}

const startOf = (key: string): PaceState => ({ key, shown: 1, picks: {} })

/**
 * How far into a step's transcript the player is. `advance` shows the next beat: the container
 * calls it for each command the player finishes in the terminal, and Continue calls it too, so
 * the explanation of a result comes after the result. `key` names the step; a new one starts over.
 */
export function useGuidePace(key: string): GuidePace {
  const [pace, setPace] = useState<PaceState>(() => startOf(key))
  const current = pace.key === key ? pace : startOf(key)
  const advance = useCallback(
    () =>
      setPace((previous) => {
        const from = previous.key === key ? previous : startOf(key)
        return { ...from, shown: from.shown + 1 }
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
