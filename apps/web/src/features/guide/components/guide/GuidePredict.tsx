import type { GuidePredict as GuidePredictPart } from '@features/guide/types'
import { InlineText } from '@shared/components/ui'

export interface GuidePredictProps {
  predict: GuidePredictPart
}

/** The answers to a question the story asked: picked first, then shown beside what happens. No score. */
export function GuidePredict({ predict }: GuidePredictProps) {
  const { onPick } = predict
  if (onPick !== null) {
    return (
      <fieldset className="guide__predict">
        <legend>{predict.line.speaker ? `Your call, before ${predict.line.speaker} answers` : 'Your call'}</legend>
        <div className="guide__predict-options">
          {predict.options.map((option, index) => (
            <button key={option.text} type="button" onClick={() => onPick(index)}>
              <InlineText text={option.text} />
            </button>
          ))}
        </div>
        <p className="guide__predict-hint">
          No score.{' '}
          <button type="button" onClick={() => onPick(null)}>
            Just show me
          </button>
        </p>
      </fieldset>
    )
  }
  const { revealed } = predict
  return (
    <ul className="guide__predict guide__predict--answered" aria-label="Answers">
      {predict.options.map((option, index) => (
        <li
          key={option.text}
          className={
            option.right && revealed ? 'guide__predict-answer guide__predict-answer--right' : 'guide__predict-answer'
          }
        >
          <InlineText text={option.text} />
          {index === predict.picked && <span className="guide__predict-tag">your call</span>}
          {option.right && revealed && (
            <span className="guide__predict-tag guide__predict-tag--right">what happens</span>
          )}
        </li>
      ))}
      {!revealed && <li className="guide__predict-hint">Kept. Now do it, and see what happens.</li>}
    </ul>
  )
}
