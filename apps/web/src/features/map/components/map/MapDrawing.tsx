import { HereFlag, NodeMark, RoadPath } from '@features/map/components/marks'
import type { MapNoteTarget, MapScene, OverviewWindow, SceneStop } from '@features/map/types'
import { EDGE, NODE_SIZE, walkTarget } from '@features/map/utils/layout'
import { targetAt } from '@features/map/utils/note'
import { type KeyboardEvent, type MouseEvent, memo, useId, useMemo, useRef } from 'react'
import './MapDrawing.css'
import { MapTerminus } from './MapEnds'
import { MapTexts } from './MapTexts'

interface DrawingBase {
  scene: MapScene
  /** Plays one gentle pulse on the "you are here" ring; off under reduced motion. */
  pulse: boolean
}

/** The Peer Map: every stop a button. */
interface MapDrawingInteractive extends DrawingBase {
  variant: 'map'
  selectedKey: string | null
  onSelect: (key: string) => void
  onPlay: (key: string) => void
  onFocusStop: (stop: SceneStop) => void
  /** The stop or stage under the pointer; null when it leaves. */
  onPoint: (target: MapNoteTarget | null) => void
  /** The focused stop; null on blur. */
  onFocusNote: (target: MapNoteTarget | null) => void
}

/** Fig. 1 on the title page: one read-only image, cropped to `shown`. */
interface MapDrawingOverview extends DrawingBase {
  variant: 'overview'
  shown: OverviewWindow
  description: string
}

export type MapDrawingProps = MapDrawingInteractive | MapDrawingOverview

function StopMark({ stop, pulse }: { stop: SceneStop; pulse: boolean }) {
  return (
    <>
      <g transform={`translate(${stop.x} ${stop.y})`}>
        <NodeMark
          size={NODE_SIZE}
          state={stop.stop.state}
          planned={stop.stop.planned}
          here={stop.stop.here}
          pulse={pulse && stop.stop.here}
        />
        <rect className="map-node__ring" x="-21" y="-21" width="42" height="42" />
      </g>
      <MapTexts texts={stop.texts} />
    </>
  )
}

// Memoized: the map's heaviest render, and scrolling or the gauge never changes it.
export const MapDrawing = memo(function MapDrawing(props: MapDrawingProps) {
  const id = useId()
  const hatch = `${id}-hatch`
  const cross = `${id}-cross`
  const refs = useRef(new Map<string, SVGGElement>())
  const { scene, pulse } = props
  const { stops, width, height } = scene
  const map = props.variant === 'map' ? props : null
  const tabKey = map ? (map.selectedKey ?? scene.here?.key ?? stops[0]?.key) : null
  const view = props.variant === 'overview' ? props.shown : { top: 0, height }
  const stages = useMemo(() => scene.chapters.map((chapter) => chapter.id), [scene])

  // One handler for the whole sheet: paint order can't hide a stage's band under its hatching.
  const onMouseMove = (event: MouseEvent<SVGSVGElement>) => {
    if (!map) {
      return
    }
    const stop = event.target instanceof Element ? event.target.closest('[data-stop]') : null
    const key = stop?.getAttribute('data-stop')
    if (key) {
      map.onPoint({ kind: 'stop', key })
      return
    }
    map.onPoint(targetAt(scene.chapters, event.clientY - event.currentTarget.getBoundingClientRect().top + view.top))
  }

  const onKeyDown = (event: KeyboardEvent<SVGGElement>, index: number) => {
    const stop = stops[index]
    if (!stop || !map) {
      return
    }
    const target = walkTarget(event.key, index, stops, stages)
    if (target !== null) {
      event.preventDefault()
      const to = stops[target]
      if (to) {
        refs.current.get(to.key)?.focus({ preventScroll: true })
      }
    } else if (event.key === 'Enter') {
      event.preventDefault()
      map.onPlay(stop.key)
    } else if (event.key === ' ') {
      event.preventDefault()
      map.onSelect(stop.key)
    }
  }

  return (
    <svg
      className={`map-fig map-fig--${props.variant}`}
      width={width}
      height={view.height}
      viewBox={`0 ${view.top} ${width} ${view.height}`}
      role={map ? 'group' : 'img'}
      aria-labelledby={`${id}-t`}
      onMouseMove={map ? onMouseMove : undefined}
      onMouseLeave={map ? () => map.onPoint(null) : undefined}
    >
      <title id={`${id}-t`}>
        {props.variant === 'overview'
          ? props.description
          : 'Peer Map, drawn as the journey from one router down to an operated network. Each stage lists its missions in play order.'}
      </title>
      <defs>
        <pattern id={hatch} width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="8" stroke="var(--hatch)" strokeWidth="1.5" />
        </pattern>
        <pattern id={cross} width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="10" stroke="var(--hatch)" strokeWidth="1.5" />
          <line x1="0" y1="0" x2="10" y2="0" stroke="var(--hatch)" strokeWidth="1.5" />
        </pattern>
      </defs>

      {scene.chapters.map((chapter, index) => (
        <g key={chapter.id}>
          {map && (
            <rect x="0" y={chapter.top} width={width} height={chapter.bottom - chapter.top} className="map-fig__hit" />
          )}
          {chapter.tone !== 'passed' && (
            <rect
              x="0"
              y={chapter.top}
              width={width}
              height={chapter.bottom - chapter.top}
              fill={`url(#${hatch})`}
              className={`map-fig__band map-fig__band--${chapter.tone}`}
            />
          )}
          {index > 0 && <line x1="0" x2={width} y1={chapter.top} y2={chapter.top} className="map-fig__grade" />}
          <rect
            x={chapter.panel.x}
            y={chapter.panel.y}
            width={chapter.panel.width}
            height={chapter.panel.height}
            className="map-fig__panel"
          />
        </g>
      ))}

      {scene.terminus && (
        <g>
          <rect
            x="0"
            y={scene.terminus.top}
            width={width}
            height={scene.terminus.bottom - scene.terminus.top}
            fill={`url(#${cross})`}
            className="map-fig__band"
          />
          <line x1="0" x2={width} y1={scene.terminus.top} y2={scene.terminus.top} className="map-fig__grade" />
        </g>
      )}

      {scene.terminus && <MapTerminus terminus={scene.terminus} />}

      <g>
        <RoadPath road={scene.road} />
        {scene.start && <circle cx={scene.start.x} cy={scene.start.y} r="6" className="map-fig__start" />}
      </g>

      {scene.chapters.map((chapter) =>
        map ? (
          // biome-ignore lint/a11y: an SVG <g> is neither interactive nor a fieldset; its printed words (stage, name, progress, what it covers) are the stage's summary
          <g key={chapter.id} role="group" aria-label={chapter.name}>
            <MapTexts texts={chapter.texts} />
            {stops.map((stop, index) =>
              stop.chapterId !== chapter.id ? null : (
                // biome-ignore lint/a11y/useSemanticElements: an SVG stop can't be a <button>; it is one by role, focus and keys
                <g
                  key={stop.key}
                  ref={(element) => {
                    if (element) {
                      refs.current.set(stop.key, element)
                    } else {
                      refs.current.delete(stop.key)
                    }
                  }}
                  role="button"
                  tabIndex={stop.key === tabKey ? 0 : -1}
                  aria-label={
                    stop.stop.planned
                      ? `${stop.stop.title} in stage ${stop.stop.number}, ${stop.stop.status}`
                      : `${stop.stop.number} ${stop.stop.title}, ${stop.stop.status}`
                  }
                  aria-describedby={`${id}-d${index}`}
                  aria-pressed={stop.key === map.selectedKey}
                  data-stop={stop.key}
                  className={`map-node${stop.key === map.selectedKey ? ' map-node--selected' : ''}`}
                  onClick={() => map.onSelect(stop.key)}
                  onDoubleClick={() => map.onPlay(stop.key)}
                  onFocus={() => {
                    map.onSelect(stop.key)
                    map.onFocusStop(stop)
                    map.onFocusNote({ kind: 'stop', key: stop.key })
                  }}
                  onBlur={() => map.onFocusNote(null)}
                  onKeyDown={(event) => onKeyDown(event, index)}
                >
                  <desc id={`${id}-d${index}`}>{stop.stop.summary}</desc>
                  <StopMark stop={stop} pulse={pulse} />
                </g>
              )
            )}
          </g>
        ) : (
          <g key={chapter.id}>
            <MapTexts texts={chapter.texts} />
            {stops.map((stop) =>
              stop.chapterId !== chapter.id ? null : <StopMark key={stop.key} stop={stop} pulse={pulse} />
            )}
          </g>
        )
      )}

      {scene.here && (
        <HereFlag stop={scene.here} nodeSize={NODE_SIZE} bounds={{ left: EDGE, right: width - EDGE, top: 0 }} />
      )}
    </svg>
  )
})
