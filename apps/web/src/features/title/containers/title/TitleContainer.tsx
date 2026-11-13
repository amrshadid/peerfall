import { useCheatSheet } from '@app/store'
import { useSaveStatus } from '@features/chrome/hooks/save'
import { useScreenChrome } from '@features/chrome/hooks/screen'
import { useContent } from '@features/content/hooks/content'
import { journeyChapters } from '@features/map'
import { TitlePresentation } from '@features/title/components/title'
import { useEnterActivatesPrimary, useNewGame } from '@features/title/hooks/title'
import {
  continueTargetOf,
  currentChapter,
  firstMissionOf,
  lastPlayedText,
  titleContentsOf,
  volumeOf,
} from '@features/title/utils/contents'
import { useTourScreen } from '@features/tour/hooks/tour'
import { useCodex, useMissionList, useProgress } from '@peerfall/game/hooks'
import { useReducedMotion } from '@shared/hooks/motion'
import { useNow } from '@shared/hooks/time'
import { hrefOf } from '@shared/navigation'
import { saveStatusText } from '@shared/utils/format'
import { useMemo } from 'react'

export function TitleContainer() {
  const chrome = useScreenChrome()
  useTourScreen('title')
  const content = useContent()
  const { progress } = useProgress()
  const { saveState, lastSavedAt } = useSaveStatus()
  const list = useMissionList()
  const codex = useCodex()
  const { openCheatSheet } = useCheatSheet()
  const now = useNow()
  const reducedMotion = useReducedMotion()

  const hasSave = progress.missions.length > 0
  const firstMission = content.game.missions[0]
  const { confirming, newGame, startOver, cancel } = useNewGame({ hasSave, firstMission: firstMission?.id })
  useEnterActivatesPrimary(!confirming)

  // Fig. 1 is the map itself, from the same stops, so "you are here" is where Continue goes.
  const journey = useMemo(() => journeyChapters(list.chapters, list.next), [list.chapters, list.next])
  // The stage the player is in names the manual's volume and the map's progress.
  const chapter = currentChapter(list.chapters, list.next)
  const target = hasSave ? list.next : null

  return (
    <TitlePresentation
      chrome={chrome}
      volume={volumeOf(chapter)}
      continueTo={
        target
          ? continueTargetOf({
              mission: target,
              chapters: list.chapters,
              lastPlayed: lastPlayedText(now, lastSavedAt),
            })
          : null
      }
      firstMission={firstMissionOf(firstMission)}
      onNewGame={newGame}
      contents={titleContentsOf({ chapter, firstMission, codexCards: codex.filed, onNewGame: newGame })}
      figure={{ chapters: journey, href: hrefOf({ name: 'map' }), pulse: !reducedMotion }}
      newGame={{
        open: confirming,
        onCancel: cancel,
        onStart: () => void startOver(false),
        onExportAndStart: () => void startOver(true),
      }}
      saveText={saveStatusText(saveState, lastSavedAt === null ? null : now - lastSavedAt)}
      onShortcuts={openCheatSheet}
      privacyHref={hrefOf({ name: 'settings', section: 'privacy' })}
    />
  )
}
