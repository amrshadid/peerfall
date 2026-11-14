import type { DebriefPresentationProps } from '@features/debrief/types'
import { CodexCard } from '@shared/components/codex'
import { Button, ButtonLink, InlineText, SectionHead, TitleBlock } from '@shared/components/ui'
import './Debrief.css'

/** Each card feeds out this much after the one before it. */
const FEED_STAGGER_MS = 120

/**
 * After the mission, laid out as Kernelfall's level card: the headline, the result, the terms it
 * taught and the way on, then what the runs measured and the Codex cards it filed.
 */
export function DebriefPresentation({
  headline,
  result,
  measures,
  learned,
  cards,
  seenIn,
  stage,
  next,
  onReplay,
  mapHref,
  onMap,
}: DebriefPresentationProps) {
  return (
    <section className="debrief" aria-labelledby="debrief-h">
      <header className="debrief__head">
        <h2 id="debrief-h">
          <InlineText text={headline} />
        </h2>
        <p>{result}</p>
        {learned.length > 0 && (
          <p className="debrief__learned">
            <span>New in this mission</span>
            {learned.map((term) => (
              <InlineText key={term} text={term} />
            ))}
          </p>
        )}
        <div className="debrief__actions">
          {next && (
            <Button variant="primary" onClick={next.onSelect}>
              {next.label}
            </Button>
          )}
          <Button onClick={onReplay}>Replay mission</Button>
          <ButtonLink variant={next ? 'default' : 'primary'} href={mapHref} onClick={onMap}>
            Back to the map
          </ButtonLink>
        </div>
      </header>

      <div className="debrief__body">
        {stage && (
          <section className="debrief__stage" aria-labelledby="debrief-stage-h">
            <h3 id="debrief-stage-h">{stage.name}, done</h3>
            <p>You can now…</p>
            <ul>
              {stage.outcomes.map((outcome) => (
                <li key={outcome}>
                  <InlineText text={outcome} />
                </li>
              ))}
            </ul>
          </section>
        )}

        {measures.length > 0 && (
          <section aria-labelledby="debrief-measures-h">
            <SectionHead id="debrief-measures-h" level={3}>
              What was measured
            </SectionHead>
            <TitleBlock entries={measures} label="Measurements" />
          </section>
        )}

        {cards.map((card, index) => (
          <div key={card.id} className="debrief__feed" style={{ animationDelay: `${index * FEED_STAGGER_MS}ms` }}>
            <CodexCard card={card} stamp={{ label: 'Filed', note: `Codex · ${seenIn}` }} />
          </div>
        ))}
      </div>
    </section>
  )
}
