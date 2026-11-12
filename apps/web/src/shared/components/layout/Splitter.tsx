import type { SizeLimits } from '@shared/types'
import { draggedSize, keyedSize } from '@shared/utils/layout'
import { type KeyboardEvent, type PointerEvent, useRef } from 'react'
import './Splitter.css'

export interface SplitterProps {
  label: string
  /** `vertical`: an upright divider dragged sideways; `horizontal`: one dragged up and down. */
  orientation: 'vertical' | 'horizontal'
  /** 1 when dragging right or down grows the panel; -1 for a panel on the right or below. */
  direction: 1 | -1
  limits: SizeLimits
  /** How far one arrow key moves it, in the size unit. */
  step: number
  /** The size the player chose, or null while the screen's default holds. */
  value: number | null
  /** The panel's size as drawn, in the size unit: where a drag or a key press starts from. */
  measure: () => number
  /** Pixels in one size unit: a rem, or one percent of the space being split. */
  pxPerUnit: () => number
  onResize: (size: number) => void
  /** Double-click: back to the default. */
  onReset: () => void
  /** Out of reach while something covers it, like the debrief. */
  inert?: boolean
}

interface Drag {
  readonly start: number
  readonly origin: number
  readonly pxPerUnit: number
  frame: number
  next: number | null
}

/** A drag, the arrow keys or a double-click resize the panel beside it (WCAG 2.5.7: dragging has a key alternative). */
export function Splitter(props: SplitterProps) {
  const { orientation, direction, limits } = props
  const drag = useRef<Drag | null>(null)
  const position = (event: PointerEvent) => (orientation === 'vertical' ? event.clientX : event.clientY)

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) {
      return
    }
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    drag.current = {
      start: props.measure(),
      origin: position(event),
      pxPerUnit: props.pxPerUnit(),
      frame: 0,
      next: null,
    }
    document.body.classList.add('pf-resizing', `pf-resizing--${orientation}`)
  }

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const current = drag.current
    if (!current) {
      return
    }
    current.next = draggedSize(current.start, position(event) - current.origin, current.pxPerUnit, direction, limits)
    // One resize per frame: every resize refits the editor and the terminal.
    if (current.frame === 0) {
      current.frame = requestAnimationFrame(() => {
        current.frame = 0
        if (current.next !== null) {
          props.onResize(current.next)
        }
      })
    }
  }

  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const current = drag.current
    if (!current) {
      return
    }
    cancelAnimationFrame(current.frame)
    if (current.next !== null) {
      props.onResize(current.next)
    }
    drag.current = null
    event.currentTarget.releasePointerCapture(event.pointerId)
    document.body.classList.remove('pf-resizing', `pf-resizing--${orientation}`)
  }

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const size = keyedSize(props.measure(), event.key, props.step, direction, limits)
    if (size !== null) {
      event.preventDefault()
      props.onResize(size)
    }
  }

  return (
    // biome-ignore lint/a11y/useSemanticElements: an <hr> can't take focus or keys; a focusable separator is the ARIA pattern for a splitter
    <div
      role="separator"
      tabIndex={0}
      inert={props.inert}
      aria-label={props.label}
      aria-orientation={orientation}
      aria-valuemin={limits.min}
      aria-valuemax={limits.max}
      aria-valuenow={props.value ?? undefined}
      className={`pf-splitter pf-splitter--${orientation}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onKeyDown={onKeyDown}
      onDoubleClick={props.onReset}
    />
  )
}
