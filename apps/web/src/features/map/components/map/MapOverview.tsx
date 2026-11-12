import { useMapOverview } from '@features/map/hooks/drawing'
import type { JourneyChapter } from '@features/map/types'
import { overviewDescription } from '@features/map/utils/layout'
import { MapDrawing } from './MapDrawing'
import './MapOverview.css'

export interface MapOverviewProps {
  /** The journey as the map draws it: `journeyChapters(chapters, next)`. */
  chapters: readonly JourneyChapter[]
  /** The Peer Map, which opens scrolled to "you"; null where the drawing is only a figure. */
  href: string | null
  /** One gentle pulse on the "you are here" ring; pass false under reduced motion. */
  pulse?: boolean
  /** Where the player stands and what's next, for screen readers; worked out from `chapters` when left out. */
  description?: string
}

/** The Peer Map's own drawing, windowed around "you": one link to the full map, or a plain figure. */
export function MapOverview({ chapters, href, pulse = false, description }: MapOverviewProps) {
  const { frameRef, scene, shown } = useMapOverview(chapters)
  const words = description ?? overviewDescription(chapters)
  const fades = `${shown?.fadeTop ? ' map-overview__frame--fade-top' : ''}${shown?.fadeBottom ? ' map-overview__frame--fade-bottom' : ''}`
  const frame = (
    // A figure has no window to fit: it takes the drawing's own height and shows all of it.
    <div
      ref={frameRef}
      className={`map-overview__frame${fades}`}
      style={href === null && scene ? { height: scene.height } : undefined}
    >
      {scene && shown ? (
        <MapDrawing variant="overview" scene={scene} shown={shown} description={words} pulse={pulse} />
      ) : (
        <span className="pf-visually-hidden">{words}</span>
      )}
    </div>
  )
  return href === null ? (
    <div className="map-overview">{frame}</div>
  ) : (
    <a className="map-overview" href={href}>
      {frame}
    </a>
  )
}
