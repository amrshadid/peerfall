import { useRailMode } from '@shared/hooks/layout'
import type { RailMode, RailStep, StepState } from '@shared/types'
import { railLabelShown, stepStates } from '@shared/utils/steps'
import { type Ref, useRef } from 'react'
import './StepRail.css'

export interface StepRailProps {
  /** Names the list for screen readers, e.g. "Mission steps". */
  label: string
  steps: readonly RailStep[]
  /** Index of the current step; `steps.length` once every step is done. */
  currentIndex: number
  /** The step being looked at again, if the player went back to one. */
  reviewing?: string | null
  /** Lets the player revisit a done step. Without it, done steps are plain text. */
  onSelect?: (id: string) => void
}

const labelClass = (shown: boolean) => (shown ? 'pf-rail__label' : 'pf-rail__label pf-visually-hidden')

export function StepRail({ label, steps, currentIndex, reviewing = null, onSelect }: StepRailProps) {
  const states = stepStates(steps.length, currentIndex)
  const railRef = useRef<HTMLDivElement>(null)
  const fullRef = useRef<HTMLOListElement>(null)
  const currentRef = useRef<HTMLOListElement>(null)
  const mode = useRailMode(railRef, fullRef, currentRef)
  return (
    <div className="pf-rail" ref={railRef}>
      <ol className={`pf-rail__list pf-rail__list--${mode}`} aria-label={label}>
        {steps.map((step, index) => {
          const state = states[index] ?? 'future'
          const isReviewed = reviewing === step.id
          const shown = railLabelShown(mode, state)
          // A hidden label still names the step for screen readers; the tooltip names it for the mouse.
          const tooltip = shown ? undefined : step.label
          return (
            <li
              key={step.id}
              className={`pf-rail__step pf-rail__step--${state}${isReviewed ? ' pf-rail__step--reviewing' : ''}${shown ? '' : ' pf-rail__step--bare'}`}
              aria-current={state === 'current' ? 'step' : undefined}
              title={state === 'done' && onSelect ? undefined : tooltip}
            >
              {state === 'done' && onSelect ? (
                <button
                  type="button"
                  onClick={() => onSelect(step.id)}
                  aria-pressed={isReviewed}
                  aria-label={`${step.label} (done), look again`}
                  title={tooltip}
                >
                  <span className="pf-rail__sq" aria-hidden="true" />
                  <span className={labelClass(shown)}>{step.label}</span>
                </button>
              ) : (
                <>
                  <span className="pf-rail__sq" aria-hidden="true" />
                  <span className={labelClass(shown)}>{step.label}</span>
                </>
              )}
              {state === 'done' && !onSelect && <span className="pf-visually-hidden">(done)</span>}
            </li>
          )
        })}
      </ol>
      {/* Unseen copies at their natural width: what each mode would need, measured in the real fonts. */}
      <div className="pf-rail__measure" aria-hidden="true" inert>
        <RailCopy listRef={fullRef} mode="full" steps={steps} states={states} />
        <RailCopy listRef={currentRef} mode="current" steps={steps} states={states} />
      </div>
    </div>
  )
}

interface RailCopyProps {
  listRef: Ref<HTMLOListElement>
  mode: RailMode
  steps: readonly RailStep[]
  states: readonly StepState[]
}

function RailCopy({ listRef, mode, steps, states }: RailCopyProps) {
  return (
    <ol ref={listRef} className={`pf-rail__list pf-rail__list--${mode}`}>
      {steps.map((step, index) => {
        const state = states[index] ?? 'future'
        return (
          <li key={step.id} className={`pf-rail__step pf-rail__step--${state}`}>
            <span className="pf-rail__sq" />
            <span className={labelClass(railLabelShown(mode, state))}>{step.label}</span>
          </li>
        )
      })}
    </ol>
  )
}
