import type { GuidePresentationProps } from '@features/guide/types'
import { speakerOf } from '@features/guide/utils/story'
import { Button, Checklist, Chip, Dialogue, Icon, InlineText, SectionHead } from '@shared/components/ui'
import { Fragment, useState } from 'react'
import './Guide.css'
import { GuidePredict } from './GuidePredict'
import { speakerWithPortraits } from './Portraits'

// A beat or hint that appears after the player acts is brought into view; the first one is already there.
const showNewest = (element: HTMLElement | null) => element?.scrollIntoView?.({ block: 'nearest' })

/**
 * The mission's story told in beats: text up to each pause, the rest once the player finishes a
 * command or presses Continue. Then the objectives, ticking by themselves, the commands to try,
 * the hints asked for and the Codex cards the mission files.
 */
export function GuidePresentation({
  stepLabel,
  reviewNote,
  lead = null,
  beats,
  onContinue,
  showObjectives,
  objectives,
  chips,
  hints,
  codex,
  codexOpen,
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
  const codexChips = (
    <p className="guide__chips">
      {codex.map((card) => (
        <Chip key={card.id} href={card.href}>
          {card.term}
        </Chip>
      ))}
    </p>
  )

  return (
    <div className="guide">
      <div className="guide__body">
        {reviewNote !== null && <p className="guide__review">{reviewNote}</p>}
        {lead != null && (
          <p className="guide__review">
            <InlineText text={lead} />
          </p>
        )}

        {beats.map((beat, index) => {
          const current = index === beats.length - 1
          return (
            <div
              // biome-ignore lint/suspicious/noArrayIndexKey: beats of a step never reorder
              key={index}
              ref={current && index > 0 ? showNewest : undefined}
              className={current ? 'guide__beat' : 'guide__beat guide__beat--read'}
            >
              {beat.map((part, at) => {
                if (part.kind === 'code') {
                  return (
                    // biome-ignore lint/suspicious/noArrayIndexKey: parts of a beat never reorder
                    <pre key={at} className="guide__code">
                      {part.text}
                    </pre>
                  )
                }
                if (part.kind === 'heading') {
                  return (
                    // biome-ignore lint/suspicious/noArrayIndexKey: parts of a beat never reorder
                    <h3 key={at} className="guide__heading">
                      {part.text}
                    </h3>
                  )
                }
                return (
                  // biome-ignore lint/suspicious/noArrayIndexKey: parts of a beat never reorder
                  <Fragment key={at}>
                    <Dialogue
                      label={`${stepLabel}: transcript`}
                      // Only the step's first lines introduce the speaker.
                      continued={
                        index > 0 ||
                        beat.findIndex((other) => other.kind === 'lines' || other.kind === 'predict') !== at
                      }
                      lines={(part.kind === 'predict' ? [part.line] : part.lines).map((line) => ({
                        speaker: speakerWithPortraits(speakerOf(line.speaker)),
                        text: <InlineText text={line.text} />,
                      }))}
                    />
                    {part.kind === 'predict' && <GuidePredict predict={part} />}
                  </Fragment>
                )
              })}
            </div>
          )
        })}
        {onContinue !== null && (
          <button type="button" className="guide__continue" onClick={onContinue}>
            Continue
          </button>
        )}

        {showObjectives && objectives.length > 0 && (
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
                        <InlineText text={`Seen: ${objective.evidence}`} />
                      </span>
                    )}
                  </>
                ),
                ...(objective.passed || !objective.observed
                  ? {}
                  : { why: <InlineText text={`Seen: ${objective.observed}`} /> }),
              }))}
            />
          </section>
        )}

        {chips.length > 0 && (
          <section aria-labelledby="guide-commands-h" className="guide__commands">
            <SectionHead id="guide-commands-h">Commands to try</SectionHead>
            <ul>
              {chips.map((chip) => (
                <li key={chip.command}>
                  {chip.onRun ? (
                    <button
                      type="button"
                      className="guide__command"
                      onClick={chip.onRun}
                      aria-label={`Run ${chip.command} in the terminal`}
                    >
                      {chip.command}
                    </button>
                  ) : (
                    <code className="guide__command guide__command--name">{chip.command}</code>
                  )}
                  <span>
                    <InlineText text={chip.explain} />
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {(hints.revealed.length > 0 || hints.left > 0) && (
          <section aria-labelledby="guide-hints-h" className="guide__hints">
            <SectionHead id="guide-hints-h" aside={hints.left > 0 ? `${hints.left} left` : 'none left'}>
              {hints.by}'s hints
            </SectionHead>
            {hints.revealed.length > 0 ? (
              <ol aria-live="polite">
                {hints.revealed.map((hint, index) => (
                  <li key={hint.tier} ref={index === hints.revealed.length - 1 && index > 0 ? showNewest : undefined}>
                    <span className="guide__hint-tier">
                      Hint {index + 1}, {hint.tier}
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
              <p className="guide__hints-none">Three hints: a nudge first, then the concept, then the spot.</p>
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

        {codex.length > 0 && !codexOpen && (
          <details className="guide__codex-fold">
            <summary>
              Codex{' '}
              <span>
                {codex.length} card{codex.length === 1 ? '' : 's'} for this mission
              </span>
            </summary>
            {codexChips}
          </details>
        )}
        {codex.length > 0 && codexOpen && (
          <section aria-labelledby="guide-codex-h">
            <SectionHead id="guide-codex-h">Codex</SectionHead>
            {codexChips}
          </section>
        )}
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
