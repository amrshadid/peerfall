import { NodeMarkIcon } from '@features/map/components/marks'
import type { MapDetail, StopState } from '@features/map/types'
import { ButtonLink } from '@shared/components/ui'
import './MapDetailPanel.css'

// Kernelfall's legend, entry for entry: only the two that named Taint and init's version are reworded.
const LEGEND: readonly { state: StopState; planned?: boolean; label: string }[] = [
  { state: 'locked', planned: true, label: 'Not built yet' },
  { state: 'locked', label: 'Locked' },
  { state: 'available', label: 'Available' },
  { state: 'progress', label: 'In progress' },
  { state: 'done', label: 'Done' },
  { state: 'clean', label: 'Done, first try' },
  { state: 'helped', label: 'Done with help' },
]

/** The side panel: everything about the selected stop, its action, and the legend of shapes. */
export function MapDetailPanel({ detail }: { detail: MapDetail }) {
  return (
    <aside className="map-detail" aria-labelledby="map-detail-h">
      <div className="map-detail__head">
        <p>{detail.place}</p>
        <h2 id="map-detail-h">{detail.title}</h2>
        {detail.status !== '' && (
          <span className={`map-detail__state map-detail__state--${detail.planned ? 'planned' : detail.state}`}>
            <NodeMarkIcon state={detail.state} planned={detail.planned} />
            {detail.status}
          </span>
        )}
      </div>
      <div className="map-detail__body">
        {detail.about !== null && (
          <dl>
            <div>
              <dt>{detail.about.term}</dt>
              <dd>{detail.about.text}</dd>
            </div>
            {detail.skills.length > 0 && (
              <div>
                <dt>Skill</dt>
                <dd>
                  {detail.skills.map((skill) => (
                    <span key={skill.id} className="map-detail__skill">
                      {skill.title} <code>{skill.id}</code>
                    </span>
                  ))}
                </dd>
              </div>
            )}
            {detail.needs !== null && (
              <div>
                <dt>Needs</dt>
                <dd>
                  {detail.needs.length === 0
                    ? 'Nothing: start here'
                    : detail.needs.map((need) => (
                        <span key={need.id} className="map-detail__need" title={need.title}>
                          <code>{need.id}</code>{' '}
                          <span className={need.met ? 'map-detail__ok' : 'map-detail__missing'}>
                            <span aria-hidden="true">{need.met ? '✓' : '✗'}</span>
                            <span className="pf-visually-hidden">{need.met ? ' met' : ' not yet'}</span>
                          </span>
                        </span>
                      ))}
                </dd>
              </div>
            )}
            {detail.time !== null && (
              <div>
                <dt>Time</dt>
                <dd>{detail.time}</dd>
              </div>
            )}
            {detail.attempts !== null && (
              <div>
                <dt>Attempts</dt>
                <dd>{detail.attempts}</dd>
              </div>
            )}
            {detail.hints !== null && (
              <div>
                <dt>Hints used</dt>
                <dd>{detail.hints}</dd>
              </div>
            )}
            {detail.recovery !== null && (
              <div>
                <dt>Target</dt>
                <dd>{detail.recovery}</dd>
              </div>
            )}
            {detail.parts.length > 0 && (
              <div>
                <dt>FRR parts</dt>
                <dd className="map-detail__parts">
                  {detail.parts.map((part, index) => (
                    <span key={part}>
                      {index > 0 && ' · '}
                      <code>{part}</code>
                    </span>
                  ))}
                </dd>
              </div>
            )}
            {detail.codex.length > 0 && (
              <div>
                <dt>Codex</dt>
                <dd className="map-detail__codex">
                  {detail.codex.map((card, index) => (
                    <span key={card.id}>
                      {index > 0 && ' · '}
                      <a href={card.href}>
                        <code>{card.term}</code>
                      </a>
                    </span>
                  ))}
                </dd>
              </div>
            )}
          </dl>
        )}
        {detail.note !== null && <p className="map-detail__note">{detail.note}</p>}
        {detail.play && (
          <div className="map-detail__actions">
            <ButtonLink variant="primary" href={detail.play.href}>
              {detail.play.label}
            </ButtonLink>
          </div>
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
        </ul>
      </section>
    </aside>
  )
}
