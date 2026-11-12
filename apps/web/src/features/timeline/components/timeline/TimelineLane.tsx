import type { TimelineAxis, TimelineRun } from '@features/timeline/types'
import { axisPercent, MARK_LETTERS } from '@features/timeline/utils/runs'

export interface TimelineLaneProps {
  /** Which run the lane is for, shown even before it was recorded. */
  label: string
  run: TimelineRun | null
  axis: TimelineAxis
}

const percent = (value: number) => `${value}%`

/**
 * One run on the shared axis: a hatched bar for as long as traffic was lost, and a lettered mark at
 * each moment. A picture only: the same moments are listed with their times in the run's table.
 */
export function TimelineLane({ label, run, axis }: TimelineLaneProps) {
  const lost = run?.outageSeconds ?? null
  return (
    <div className="timeline__lane">
      <span className="timeline__lane-label">{label}</span>
      <div className="timeline__track">
        {run === null && <span className="timeline__empty">not recorded yet</span>}
        {run !== null && (
          <span
            className={`timeline__outage${lost === null ? ' timeline__outage--open' : ''}`}
            style={{ width: percent(lost === null ? 100 : axisPercent(lost, axis)) }}
          />
        )}
        {run?.marks.map((mark, index) => (
          <span
            key={mark.kind}
            // Marks a few pixels apart alternate above and below the bar, so their letters stay readable.
            className={`timeline__mark timeline__mark--${mark.kind} timeline__mark--${index % 2 === 0 ? 'above' : 'below'}`}
            style={{ left: percent(axisPercent(mark.atSeconds, axis)) }}
          >
            <span className="timeline__mark-letter">{MARK_LETTERS[mark.kind]}</span>
          </span>
        ))}
      </div>
    </div>
  )
}
