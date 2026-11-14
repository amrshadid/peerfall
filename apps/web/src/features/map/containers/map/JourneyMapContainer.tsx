import { useCheatSheet } from '@app/store'
import { useScreenChrome } from '@features/chrome/hooks/screen'
import { JourneyMapPresentation } from '@features/map/components/map'
import { useMapMotion } from '@features/map/hooks/drawing'
import type { MapView } from '@features/map/types'
import { EMPTY_DETAIL, mapDetailOf } from '@features/map/utils/detail'
import { journeyChapters, journeyMarks, journeySummary } from '@features/map/utils/journey'
import { mapNotesOf } from '@features/map/utils/note'
import { useTourScreen } from '@features/tour/hooks/tour'
import { useMissionList, useProgress } from '@peerfall/game/hooks'
import { APP_VERSION_LABEL } from '@shared/constants/app'
import { hrefOf, navigateTo } from '@shared/navigation'
import { useCallback, useMemo, useState } from 'react'

export function JourneyMapContainer() {
  const chrome = useScreenChrome()
  useTourScreen('map')
  const { openCheatSheet } = useCheatSheet()
  const { status } = useProgress()
  const list = useMissionList()
  const reducedMotion = useMapMotion()
  const [view, setView] = useState<MapView>('missions')

  // While the save is being read every mission still shows as never started: stand nowhere rather
  // than scroll to a guess and jump again once it is in.
  const next = status === 'opening' ? null : list.next
  const chapters = useMemo(() => journeyChapters(list.chapters, next, list.skills), [list.chapters, next, list.skills])
  // In the Skills view a mission's stop is named by the first skill it earns; the panel keeps the mission's name.
  const shown = useMemo(
    () => (view === 'missions' ? chapters : journeyChapters(list.chapters, next, list.skills, view)),
    [chapters, view, list.chapters, next, list.skills]
  )
  // Every stop the drawing has: a stage with no missions yet is selected through its planned stop.
  const stops = useMemo(() => journeyMarks(chapters), [chapters])
  const notes = useMemo(() => mapNotesOf(shown), [shown])
  const hereStop = stops.find((stop) => stop.here)
  const [selectedKey, setSelectedKey] = useState<string | null>(hereStop?.key ?? null)
  const selected = stops.find((stop) => stop.key === selectedKey) ?? hereStop ?? stops[0]

  // Stable while the stops are, so the memoized drawing doesn't render for a selection.
  const play = useCallback(
    (key: string) => {
      const stop = stops.find((candidate) => candidate.key === key)
      if (stop?.playable) {
        navigateTo({ name: 'mission', missionId: stop.key })
      }
    },
    [stops]
  )

  return (
    <JourneyMapPresentation
      chrome={chrome}
      titleHref={hrefOf({ name: 'title' })}
      view={view}
      onView={setView}
      recommended={next ? { label: next.title, href: hrefOf({ name: 'mission', missionId: next.id }) } : null}
      section={{
        chapters: shown,
        notes,
        selectedKey: selected?.key ?? null,
        reducedMotion,
        onSelect: setSelectedKey,
        onPlay: play,
      }}
      detail={selected ? mapDetailOf(selected, chapters) : EMPTY_DETAIL}
      summary={journeySummary(chapters)}
      version={APP_VERSION_LABEL}
      onShortcuts={openCheatSheet}
    />
  )
}
