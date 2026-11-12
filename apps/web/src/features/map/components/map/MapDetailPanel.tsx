import { NodeMarkIcon } from '@features/map/components/marks'
import type { MapDetail, StopState } from '@features/map/types'
import { ButtonLink } from '@shared/components/ui'
import '@features/map/components/marks/Marks.css'
import './MapDetailPanel.css'

const LEGEND: readonly { state: StopState; planned?: boolean; label: string }[] = [
  { state: 'locked', planned: true, label: 'Planned' },
  { state: 'locked', label: 'Locked' },
  { state: 'available', label: 'Available' },
  { state: 'progress', label: 'In progress' },
  { state: 'done', label: 'Completed' },
]

/** The side panel: everything about the selected stop, its action, and the legend of shapes. */
export function MapDetailPanel({ detail }: { detail: MapDetail }) {
  return (
    <aside className="map-detail" aria-labelledby="map-detail-h">
      <div className="map-detail__head">
        <p>{detail.place}</p>
        <h2 id="map-detail-h">{detail.title}</h2>
        {detail.status !== '' && (
          <span className={`map-detail__state map-detail__state--${detail.state}`}>
            <NodeMarkIcon state={detail.state} />
            {detail.status}
          </span>
        )}
      </div>
      <div className="map-detail__body">
        {detail.objective !== null && (
          <dl>
            <div>
              <dt>Objective</dt>
              <dd>{detail.objective}</dd>
            </div>
            <div>
              <dt>Needs</dt>
              <dd>
                {detail.needs.length === 0
                  ? 'Nothing: start here'
                  : detail.needs.map((need) => (
                      <span key={need.id} className="map-detail__need">
                        {need.title}{' '}
                        <span className={need.met ? 'map-detail__ok' : 'map-detail__missing'}>
                          <span aria-hidden="true">{need.met ? '✓' : '✗'}</span>
                          <span className="pf-visually-hidden">{need.met ? 'completed' : 'not completed yet'}</span>
                        </span>
                      </span>
                    ))}
              </dd>
            </div>
            <div>
              <dt>Attempts</dt>
              <dd>{detail.attempts}</dd>
            </div>
            <div>
              <dt>Hints used</dt>
              <dd>{detail.hints}</dd>
            </div>
            {detail.recovery !== null && (
              <div>
                <dt>Target</dt>
                <dd>{detail.recovery}</dd>
              </div>
            )}
          </dl>
        )}
        {detail.play ? (
          <div className="map-detail__actions">
            <ButtonLink variant="primary" href={detail.play.href}>
              {detail.play.label}
            </ButtonLink>
          </div>
        ) : (
          detail.note !== null && <p className="map-detail__note">{detail.note}</p>
        )}
      </div>
      <section className="map-detail__legend" aria-labelledby="map-legend-h">
        <h3 id="map-legend-h">Legend</h3>
        <ul>
          {LEGEND.map((item) => (
            <li key={item.label}>
              <NodeMarkIcon state={item.state} planned={item.planned === true} />
              {item.label}
            </li>
          ))}
          <li>
            <svg className="map-detail__road" viewBox="0 0 34 34" aria-hidden="true">
              <path d="M2 17 H32" className="pf-road" />
            </svg>
            Road travelled
          </li>
          <li>
            <svg className="map-detail__road" viewBox="0 0 34 34" aria-hidden="true">
              <path d="M2 17 H32" className="pf-road pf-road--ahead" />
            </svg>
            Road ahead
          </li>
        </ul>
      </section>
    </aside>
  )
}
