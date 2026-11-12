import type { TimelineRun } from '@features/timeline/types'
import { formatSeconds, MARK_LETTERS, MARK_MEANINGS, outageSentence } from '@features/timeline/utils/runs'

export interface TimelineRunTableProps {
  run: TimelineRun
  targetSeconds: number | null
}

/** A run's moments as a table: what happened, where, and how many seconds after the fault. */
export function TimelineRunTable({ run, targetSeconds }: TimelineRunTableProps) {
  const good = run.outageSeconds !== null && (targetSeconds === null || run.outageSeconds < targetSeconds)
  return (
    <table className="timeline__table">
      {/* The words carry the verdict; the colour only repeats it. */}
      <caption className={good ? undefined : 'timeline__caption--open'}>{outageSentence(run, targetSeconds)}</caption>
      <thead className="pf-visually-hidden">
        <tr>
          <th scope="col">What happened</th>
          <th scope="col">Seconds after the fault</th>
        </tr>
      </thead>
      <tbody>
        {run.marks.map((mark) => (
          <tr key={mark.kind}>
            <th scope="row">
              <span className="timeline__row-head">
                {/* The same letter as on the chart; the meaning beside it is what gets read out. */}
                <span className={`timeline__letter timeline__letter--${mark.kind}`} aria-hidden="true">
                  {MARK_LETTERS[mark.kind]}
                </span>
                <span className="timeline__moment">
                  <span className="timeline__meaning">{MARK_MEANINGS[mark.kind]}</span>
                  <span className="timeline__what">{mark.label}</span>
                  {mark.detail !== null && <span className="timeline__detail">{mark.detail}</span>}
                </span>
              </span>
            </th>
            <td className="timeline__cell-time">
              {mark.kind === 'fault' ? formatSeconds(0) : `+${formatSeconds(mark.atSeconds)}`}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
