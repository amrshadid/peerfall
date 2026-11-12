import { MarkdownText } from '@features/guide/components/markdown'
import type { GuideIncident, GuidePresentationProps } from '@features/guide/types'
import { Button, Checklist, Icon, InlineText, SectionHead } from '@shared/components/ui'
import { useState } from 'react'
import './Guide.css'

// A hint that appears after a click is brought into view; the ones already there are left alone.
const showHint = (hint: HTMLLIElement | null) => hint?.scrollIntoView?.({ block: 'nearest' })

function IncidentBody({ incident }: { incident: GuideIncident }) {
  return incident.content ? (
    <MarkdownText blocks={incident.content} topLevel={3} />
  ) : (
    incident.body.map((paragraph) => (
      <p key={paragraph}>
        <InlineText text={paragraph} />
      </p>
    ))
  )
}

/** The incident, what to do about it now, the objectives the network has to meet, and the hints asked for. */
export function GuidePresentation({
  stepLabel,
  incident,
  task,
  objectives,
  commands,
  hints,
  note,
  actions,
  status = null,
}: GuidePresentationProps) {
  const passing = objectives.filter((objective) => objective.passed).length
  // The last command copied, so its button can say so; nothing else remembers it.
  const [copied, setCopied] = useState<string | null>(null)
  const copy = (command: string) => {
    hints.onCopy?.(command)
    setCopied(command)
  }

  return (
    <div className="guide">
      <div className="guide__body">
        <article className="guide__incident" aria-labelledby="guide-incident-h">
          <p className="guide__kicker">Incident report</p>
          <h2 id="guide-incident-h">{incident.title}</h2>
          {incident.source !== null && <p className="guide__source">{incident.source}</p>}
          {incident.folded ? (
            <details className="guide__report">
              <summary>Read the report again</summary>
              <IncidentBody incident={incident} />
            </details>
          ) : (
            <IncidentBody incident={incident} />
          )}
        </article>

        {task.length > 0 && (
          <section aria-labelledby="guide-task-h" className="guide__task">
            <SectionHead id="guide-task-h" aside="this step">
              {stepLabel}
            </SectionHead>
            {task.map((paragraph) => (
              <p key={paragraph}>
                <InlineText text={paragraph} />
              </p>
            ))}
          </section>
        )}

        {objectives.length > 0 && (
          <section aria-labelledby="guide-objectives-h">
            <SectionHead id="guide-objectives-h" aside={`${passing} of ${objectives.length} met`}>
              Objectives
            </SectionHead>
            <Checklist
              items={objectives.map((objective) => ({
                id: objective.id,
                passed: objective.passed,
                text: (
                  <>
                    <InlineText text={objective.text} />
                    {objective.passed && objective.evidence && (
                      <span className="guide__evidence">
                        <InlineText text={`Last run: ${objective.evidence}`} />
                      </span>
                    )}
                  </>
                ),
                ...(objective.passed || !objective.observed
                  ? {}
                  : { why: <InlineText text={`Last run: ${objective.observed}`} /> }),
              }))}
            />
          </section>
        )}

        {commands.length > 0 && (
          <section aria-labelledby="guide-commands-h" className="guide__commands">
            <SectionHead id="guide-commands-h">Commands to try</SectionHead>
            <ul>
              {commands.map((entry) => (
                <li key={entry.command}>
                  {entry.onRun ? (
                    <button
                      type="button"
                      className="guide__command"
                      onClick={entry.onRun}
                      aria-label={`Type ${entry.command} into the terminal`}
                    >
                      {entry.command}
                    </button>
                  ) : (
                    <code className="guide__command guide__command--name">{entry.command}</code>
                  )}
                  <span>
                    <InlineText text={entry.explain} />
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {(hints.revealed.length > 0 || hints.left > 0) && (
          <section aria-labelledby="guide-hints-h" className="guide__hints">
            <SectionHead id="guide-hints-h" aside={hints.left > 0 ? `${hints.left} left` : 'none left'}>
              Hints
            </SectionHead>
            {hints.revealed.length > 0 ? (
              <ol aria-live="polite">
                {hints.revealed.map((hint, index) => (
                  <li
                    key={`${hint.stage}-${hint.text}`}
                    ref={index === hints.revealed.length - 1 && index > 0 ? showHint : undefined}
                  >
                    <span className="guide__hint-stage">
                      Hint {index + 1}, {hint.stage}
                    </span>
                    <InlineText text={hint.text} />
                    {hint.command && (
                      <span className="guide__hint-command">
                        <code className="guide__command guide__command--name">{hint.command}</code>
                        {hints.onCopy && (
                          <button
                            type="button"
                            className="guide__copy"
                            onClick={() => copy(hint.command ?? '')}
                            aria-label={`Copy ${hint.command}`}
                          >
                            {copied === hint.command ? 'Copied' : 'Copy'}
                          </button>
                        )}
                      </span>
                    )}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="guide__hints-none">Hints come in stages: where to look first, a specific command last.</p>
            )}
            {hints.left > 0 && hints.onReveal !== null && (
              <button type="button" className="guide__more" onClick={hints.onReveal}>
                <Icon name="hint" size={16} />
                {hints.revealed.length === 0 ? 'Show a hint' : 'Show the next hint'}
              </button>
            )}
            {/* Said once for screen readers: the button's own word changes too. */}
            <span className="pf-visually-hidden" role="status">
              {copied === null ? '' : `Copied ${copied}`}
            </span>
          </section>
        )}

        {note !== null && <p className="guide__note">{note}</p>}
      </div>

      {status !== null && (
        <div
          className={`guide__status${status.failed ? ' guide__status--failed' : ''}${status.busy ? ' guide__status--busy' : ''}`}
          role={status.failed ? 'alert' : 'status'}
          aria-busy={status.busy || undefined}
        >
          <p>
            <span className="guide__status-word">{status.failed ? 'Fault' : status.busy ? 'Working' : 'Note'}</span>
            {status.text}
          </p>
          {status.details.map((detail) => (
            <p key={detail} className="guide__status-detail">
              {detail}
            </p>
          ))}
        </div>
      )}

      {actions.length > 0 && (
        <div className="guide__actions">
          {actions.map((action) => {
            const off = action.unavailable != null
            return (
              // aria-disabled, not disabled: the button stays focusable, so its reason can be read.
              <Button
                key={action.id}
                variant={action.kind}
                aria-disabled={off || undefined}
                title={off ? (action.unavailable ?? undefined) : undefined}
                onClick={off ? undefined : action.onSelect}
              >
                {action.label}
                {action.keys !== undefined && action.keys !== '' && <kbd>{action.keys}</kbd>}
                {off && <span className="pf-visually-hidden">, not available: {action.unavailable}</span>}
              </Button>
            )
          })}
        </div>
      )}
    </div>
  )
}
