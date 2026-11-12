import { TIMELINE_MARK_KINDS, type TimelinePresentationProps } from '@features/timeline/types'
import {
  axisPercent,
  comparisonSentence,
  formatAxisSeconds,
  formatSeconds,
  MARK_EXPLANATIONS,
  MARK_LETTERS,
  MARK_MEANINGS,
  outageSentence,
  RUN_LABELS,
  timelineAxisOf,
} from '@features/timeline/utils/runs'
import { SectionHead } from '@shared/components/ui'
import { TimelineLane } from './TimelineLane'
import { TimelineRunTable } from './TimelineRunTable'
import './Timeline.css'

const percent = (value: number) => `${value}%`
const HALF = 50

/** The outage, measured: a baseline run and a repaired run on one axis that starts at the fault. */
export function TimelinePresentation({ baseline, repaired, targetSeconds = null }: TimelinePresentationProps) {
  const runs = [baseline, repaired].filter((run) => run !== null)
  const axis = timelineAxisOf([baseline, repaired], targetSeconds)
  const comparison = comparisonSentence(baseline, repaired)
  // Only the moments a run has reached are explained: a term is met beside its evidence.
  const kinds = TIMELINE_MARK_KINDS.filter((kind) => runs.some((run) => run.marks.some((mark) => mark.kind === kind)))
  // The chart is a picture of what the tables say: one sentence stands in for it.
  const summary =
    runs.length === 0
      ? 'No run recorded yet.'
      : [...runs.map((run) => outageSentence(run, targetSeconds)), comparison ?? ''].join(' ').trim()

  return (
    <section className="timeline" aria-labelledby="timeline-h">
      <SectionHead id="timeline-h" aside="seconds after the fault">
        Timeline
      </SectionHead>

      <div className="timeline__chart" role="img" aria-label={summary}>
        <TimelineLane label={baseline?.label ?? RUN_LABELS.baseline} run={baseline} axis={axis} />
        <TimelineLane label={repaired?.label ?? RUN_LABELS.repaired} run={repaired} axis={axis} />
        <div className="timeline__lane timeline__lane--axis">
          <span className="timeline__lane-label">s</span>
          <div className="timeline__axis">
            {axis.ticks.map((tick) => (
              <span key={tick} className="timeline__tick" style={{ left: percent(axisPercent(tick, axis)) }}>
                {formatAxisSeconds(tick)}
              </span>
            ))}
            {targetSeconds !== null && (
              <>
                <span className="timeline__target-line" style={{ left: percent(axisPercent(targetSeconds, axis)) }} />
                <span
                  // Past the middle the name is set to the line's left, so it never runs off the axis's end.
                  className={`timeline__target${axisPercent(targetSeconds, axis) > HALF ? ' timeline__target--end' : ''}`}
                  style={{ left: percent(axisPercent(targetSeconds, axis)) }}
                >
                  target {formatSeconds(targetSeconds)}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {runs.length === 0 ? (
        <p className="timeline__none">
          No run recorded yet. A run starts when a link begins to drop packets and ends at the first probe that is
          answered again.
        </p>
      ) : (
        <div className="timeline__runs">
          {runs.map((run) => (
            <TimelineRunTable key={run.label} run={run} targetSeconds={targetSeconds} />
          ))}
        </div>
      )}

      <p className="timeline__compare" role="status">
        {comparison}
        {comparison === null && targetSeconds !== null && runs.length > 0 && (
          <>Target: traffic back in under {formatSeconds(targetSeconds)}.</>
        )}
      </p>

      {kinds.length > 0 && (
        <details className="timeline__legend">
          <summary>What each moment means</summary>
          <dl>
            {kinds.map((kind) => (
              <div key={kind}>
                <dt>
                  <span className={`timeline__letter timeline__letter--${kind}`} aria-hidden="true">
                    {MARK_LETTERS[kind]}
                  </span>
                  {MARK_MEANINGS[kind]}
                </dt>
                <dd>{MARK_EXPLANATIONS[kind]}</dd>
              </div>
            ))}
          </dl>
        </details>
      )}
    </section>
  )
}
