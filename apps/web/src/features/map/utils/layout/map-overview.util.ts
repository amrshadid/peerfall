import type { JourneyChapter, MapScene, OverviewWindow } from '@features/map/types'
import { journeyStops } from '@features/map/utils/journey'
import { OVERVIEW_HERE_AT } from './map-layout.constants'

/** Centred on "you" (the sheet's top when nowhere) and kept inside the drawing; `view` in px. */
export function overviewWindow(scene: MapScene, view: number): OverviewWindow {
  if (view >= scene.height) {
    return { top: 0, height: scene.height, fadeTop: false, fadeBottom: false }
  }
  const wanted = scene.here ? scene.here.y - view * OVERVIEW_HERE_AT : 0
  const top = Math.round(Math.min(Math.max(0, wanted), scene.height - view))
  return { top, height: view, fadeTop: top > 0, fadeBottom: top + view < scene.height }
}

/** "You are at 4.1 The Link That Never Went Down, in stage 4, Recover from failure; next: 4.2 … Open the Peer Map." */
export function overviewDescription(chapters: readonly JourneyChapter[]): string {
  const stops = journeyStops(chapters)
  const at = stops.findIndex((stop) => stop.here)
  const here = stops[at]
  if (!here) {
    return stops.length === 0
      ? 'The Peer Map: the stages of the journey are planned and no mission is built yet. Open the Peer Map.'
      : 'Every mission built so far is done. Open the Peer Map to replay one.'
  }
  const chapter = chapters.find((candidate) => candidate.id === here.chapterId)
  const next = stops[at + 1]
  return [
    `You are at ${here.number} ${here.title}, in stage ${here.stage}`,
    chapter ? `, ${chapter.name}` : '',
    next ? `; next: ${next.number} ${next.title}.` : '.',
    ' Open the Peer Map.',
  ].join('')
}
