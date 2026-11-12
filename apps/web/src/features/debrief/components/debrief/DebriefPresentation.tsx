import type { DebriefPresentationProps } from '@features/debrief/types'
import { Button, ButtonLink, InlineText, SectionHead, StatusMark, TitleBlock } from '@shared/components/ui'
import './Debrief.css'

/** After the mission: the verdict, what was measured, why it worked, and how to repeat it on real FRR. */
export function DebriefPresentation({
  title,
  verdict,
  measures,
  explanation,
  learned,
  commands,
  labNote,
  next,
  onReplay,
  titleHref,
}: DebriefPresentationProps) {
  return (
    <section className="debrief" aria-labelledby="debrief-h">
      <header className="debrief__head">
        <p className="debrief__kicker">Debrief</p>
        <h2 id="debrief-h">{title}</h2>
        <p className={`debrief__verdict${verdict.passed ? '' : ' debrief__verdict--open'}`}>
          <StatusMark passed={verdict.passed} />
          {verdict.text}
        </p>
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
          <Button onClick={onReplay}>Play it again</Button>
          <ButtonLink variant={next ? 'default' : 'primary'} href={titleHref}>
            Back to the title
          </ButtonLink>
        </div>
      </header>

      <div className="debrief__body">
        {measures.length > 0 && (
          <section aria-labelledby="debrief-measures-h">
            <SectionHead id="debrief-measures-h" level={3}>
              What was measured
            </SectionHead>
            <TitleBlock entries={measures} label="Measurements" />
          </section>
        )}

        {explanation.length > 0 && (
          <section aria-labelledby="debrief-why-h" className="debrief__why">
            <SectionHead id="debrief-why-h" level={3}>
              Why it worked
            </SectionHead>
            {explanation.map((paragraph) => (
              <p key={paragraph}>
                <InlineText text={paragraph} />
              </p>
            ))}
          </section>
        )}

        {commands.length > 0 && (
          <section aria-labelledby="debrief-commands-h" className="debrief__commands">
            <SectionHead id="debrief-commands-h" level={3} aside="outside the game">
              Try it on real FRR
            </SectionHead>
            {labNote !== null && (
              <p>
                <InlineText text={labNote} />
              </p>
            )}
            <dl>
              {commands.map((entry) => (
                <div key={entry.command}>
                  <dt>
                    <code>{entry.command}</code>
                  </dt>
                  <dd>
                    <InlineText text={entry.explain} />
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        )}
      </div>
    </section>
  )
}
