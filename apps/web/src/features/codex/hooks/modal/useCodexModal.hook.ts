import { hrefOf } from '@shared/navigation'
import { useCallback, useEffect, useRef } from 'react'

export interface UseCodexModalResult {
  /** Closes the card and stays on the mission. */
  readonly close: () => void
}

/**
 * A card opened from a link pushed a history entry, so closing goes back (as browser Back does);
 * a card in the address the page loaded with is replaced by the bare mission, never leaving the game.
 */
export function useCodexModal(missionId: string, cardId: string | null): UseCodexModalResult {
  const openedHere = useRef(false)
  const mounted = useRef(false)
  const open = useRef(cardId !== null)
  open.current = cardId !== null

  useEffect(() => {
    openedHere.current = cardId !== null && mounted.current
    mounted.current = true
  }, [cardId])

  const close = useCallback(() => {
    // The dialog reports its own close too, after the address already dropped the card.
    if (!open.current) {
      return
    }
    open.current = false
    if (openedHere.current) {
      openedHere.current = false
      window.history.back()
    } else {
      window.location.replace(hrefOf({ name: 'mission', missionId }))
    }
  }, [missionId])

  return { close }
}
