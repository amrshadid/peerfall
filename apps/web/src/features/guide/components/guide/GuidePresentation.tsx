import type { GuidePresentationProps } from '@features/guide/types'
import { Button, Checklist, Icon, InlineText, SectionHead } from '@shared/components/ui'
import './Guide.css'

// A hint that appears after a click is brought into view; the ones already there are left alone.
const showHint = (hint: HTMLLIElement | null) => hint?.scrollIntoView?.({ block: 'nearest' })

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
}: GuidePresentationProps) {
  const passing = objectives.filter((objective) => objective.passed).length
  return (
    <div className="guide">
      <div className="guide__body">
        <article className="guide__incident" aria-labelledby="guide-incident-h">
          <p className="guide__kicker">Incident report</p>
          <h2 id="guide-incident-h">{incident.title}</h2>
          {incident.source !== null && <p className="guide__source">{incident.source}</p>}
          {incident.body.map((paragraph) => (
            <p key={paragraph}>
              <InlineText text={paragraph} />
            </p>
          ))}
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
                text: <InlineText text={objective.text} />,
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
                  <li key={hint.stage} ref={index === hints.revealed.length - 1 && index > 0 ? showHint : undefined}>
                    <span className="guide__hint-stage">
                      Hint {index + 1}, {hint.stage}
                    </span>
                    <InlineText text={hint.text} />
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
          </section>
        )}

        {note !== null && <p className="guide__note">{note}</p>}
      </div>

      {actions.length > 0 && (
        <div className="guide__actions">
          {actions.map((action) => (
            <Button key={action.id} variant={action.kind} onClick={action.onSelect}>
              {action.label}
              {action.keys !== undefined && <kbd>{action.keys}</kbd>}
            </Button>
          ))}
        </div>
      )}
    </div>
  )
}
