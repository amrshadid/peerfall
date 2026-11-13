import type { CodexTitlePage } from '@features/codex/types'
import { InlineText } from '@shared/components/ui'
import { CodexEntries } from './CodexEntries'

export interface CodexTitlePageViewProps {
  page: CodexTitlePage
}

/** A chapter's title page: the stage's story, its guide and the real part of FRR, then its cards, then what the player can now do. */
export function CodexTitlePageView({ page }: CodexTitlePageViewProps) {
  return (
    <article className="codex-chapter" aria-labelledby={`codex-chapter-${page.id}`}>
      <header className="codex-chapter__head">
        <p className="codex-chapter__kicker">{page.kicker}</p>
        <h2 id={`codex-chapter-${page.id}`}>{page.title}</h2>
        <p className="codex-chapter__count">{page.count}</p>
      </header>
      {page.story !== null && (
        <p className="codex-chapter__story">
          <InlineText text={page.story} />
        </p>
      )}
      {(page.guide !== null || page.standsFor !== null) && (
        <dl className="codex-chapter__facts">
          {page.guide !== null && (
            <div>
              <dt>Guide</dt>
              <dd>
                <code>{page.guide.name}</code>, {page.guide.term}
              </dd>
            </div>
          )}
          {page.standsFor !== null && (
            <div>
              <dt>The real part of FRR</dt>
              <dd>
                <InlineText text={page.standsFor} />
              </dd>
            </div>
          )}
        </dl>
      )}
      <section aria-label="Cards in this chapter">
        <h3 className="codex-chapter__sub">Cards, in teaching order</h3>
        <CodexEntries entries={page.entries} variant="page" />
      </section>
      {page.youCanNow.length > 0 && (
        <section className="codex-chapter__now" aria-labelledby={`codex-now-${page.id}`}>
          <h3 id={`codex-now-${page.id}`} className="codex-chapter__sub">
            You can now…
          </h3>
          <ul>
            {page.youCanNow.map((line) => (
              <li key={line}>
                <InlineText text={line} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  )
}
