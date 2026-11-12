import type { GaugeStage } from '@features/map/types'
import type { ChapterId } from '@peerfall/game/types'
import { type KeyboardEvent, type Ref, useRef } from 'react'
import './StageGauge.css'

export interface StageGaugeProps {
  stages: readonly GaugeStage[]
  /** The stage in view. */
  current: ChapterId | null
  /** Moved by its owner through `--view-start`/`--view-size`, so scrolling never renders the gauge. */
  viewRef: Ref<HTMLSpanElement>
  /** Fraction of the gauge; null when nowhere. */
  here: number | null
  onJump: (id: ChapterId) => void
  onFindHere: () => void
  /** null when left. */
  onHover: (id: ChapterId | null) => void
  /** null on blur. */
  onFocusStage: (id: ChapterId | null) => void
}

const pct = (fraction: number) => `${(fraction * 100).toFixed(2)}%`

export function StageGauge({
  stages,
  current,
  viewRef,
  here,
  onJump,
  onFindHere,
  onHover,
  onFocusStage,
}: StageGaugeProps) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const step = { ArrowDown: 1, ArrowUp: -1 }[event.key]
    if (step !== undefined) {
      event.preventDefault()
      refs.current[Math.min(Math.max(index + step, 0), stages.length - 1)]?.focus()
    }
  }

  return (
    <nav className="map-gauge" aria-label="Stage gauge">
      <p className="map-gauge__head" aria-hidden="true">
        Stage
      </p>
      <div className="map-gauge__shaft">
        <ol className="map-gauge__scale">
          {stages.map((stage, index) => (
            <li key={stage.id} className="map-gauge__seg" style={{ top: pct(stage.start), height: pct(stage.size) }}>
              <button
                ref={(element) => {
                  refs.current[index] = element
                }}
                type="button"
                className={`map-gauge__layer map-gauge__layer--${stage.tone}`}
                aria-current={stage.id === current ? 'location' : undefined}
                aria-label={stage.label}
                title={stage.name}
                onClick={() => onJump(stage.id)}
                onKeyDown={(event) => onKeyDown(event, index)}
                onFocus={() => onFocusStage(stage.id)}
                onBlur={() => onFocusStage(null)}
                onMouseEnter={() => onHover(stage.id)}
                onMouseLeave={() => onHover(null)}
              >
                <span className="map-gauge__name">
                  <span className="map-gauge__num">{stage.stage}</span> {stage.name}
                </span>
                <span className="map-gauge__count">{stage.count}</span>
              </button>
            </li>
          ))}
        </ol>
        <span ref={viewRef} className="map-gauge__view" aria-hidden="true" />
        {here !== null && (
          <span className="map-gauge__here" style={{ top: pct(here) }} aria-hidden="true">
            You
          </span>
        )}
      </div>
      <button type="button" className="map-gauge__find" onClick={onFindHere} disabled={here === null}>
        Find me
      </button>
    </nav>
  )
}
