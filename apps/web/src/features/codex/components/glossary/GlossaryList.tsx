import type { GlossaryRow } from '@features/codex/types'
import { InlineText } from '@shared/components/ui'

export interface GlossaryListProps {
  rows: readonly GlossaryRow[]
}

/** Every word met so far, in plain words, each linked to its card. */
export function GlossaryList({ rows }: GlossaryListProps) {
  return (
    <div className="glossary">
      <p className="glossary__lead">Every word you have met so far, in plain words. Each one opens its card.</p>
      <dl className="glossary__list">
        {rows.map((row) => (
          <div key={row.href}>
            <dt>
              <a href={row.href}>
                <code>{row.term}</code>
              </a>
              <span>{row.missionNumber}</span>
            </dt>
            <dd>
              <InlineText text={row.simple} />
            </dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
