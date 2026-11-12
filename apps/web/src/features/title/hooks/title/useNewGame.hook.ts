import { useExportSave } from '@features/chrome/hooks/save'
import { useSaveActions } from '@peerfall/game/hooks'
import type { MissionId } from '@peerfall/game/types'
import { navigateTo } from '@shared/navigation'
import { useState } from 'react'

export interface UseNewGameOptions {
  readonly hasSave: boolean
  readonly firstMission: MissionId | undefined
}

export interface UseNewGameResult {
  /** The "start over?" dialog is open. */
  readonly confirming: boolean
  readonly newGame: () => void
  readonly startOver: (exportFirst: boolean) => Promise<void>
  readonly cancel: () => void
}

// A save is never wiped without asking: with one, New game opens the dialog first.
export function useNewGame({ hasSave, firstMission }: UseNewGameOptions): UseNewGameResult {
  const { reset } = useSaveActions()
  const exportSave = useExportSave()
  const [confirming, setConfirming] = useState(false)

  const play = () => {
    if (firstMission) {
      navigateTo({ name: 'mission', missionId: firstMission })
    }
  }

  const startOver = async (exportFirst: boolean) => {
    if (exportFirst) {
      exportSave()
    }
    setConfirming(false)
    await reset()
    play()
  }

  const newGame = () => {
    if (hasSave) {
      setConfirming(true)
    } else {
      play()
    }
  }

  return { confirming, newGame, startOver, cancel: () => setConfirming(false) }
}
