import { type ClarityWindow, startClarity, stopClarity } from '@features/analytics/utils/clarity'
import type { ClarityConsent } from '@shared/types'
import { useEffect } from 'react'

/** Loads Clarity only once the player allows it; any other answer stops a tag this page already has. */
export function useClarity(clarityId: string | null, consent: ClarityConsent): void {
  useEffect(() => {
    if (clarityId === null) {
      return
    }
    const win = window as Window & ClarityWindow
    if (consent === 'granted') {
      startClarity(clarityId, win, document)
    } else {
      stopClarity(win, document)
    }
  }, [clarityId, consent])
}
