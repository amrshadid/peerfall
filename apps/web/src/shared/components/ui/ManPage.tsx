import type { ManPageSection } from '@shared/types'
import './ManPage.css'

export interface ManPageProps {
  /** The running head's left and right cell, e.g. `FORK(2)`. */
  title: string
  /** The running head's centre, e.g. "Kernelfall Codex". */
  source: string
  sections: readonly ManPageSection[]
  /** A stamp in the corner, e.g. "Filed" with "Codex 8 / 40". */
  stamp?: { readonly label: string; readonly note?: string }
  headingId?: string
}

/** A Codex card in the real man page format, so collecting cards teaches reading `man`. */
export function ManPage({ title, source, sections, stamp, headingId }: ManPageProps) {
  return (
    <article className="pf-man-page" aria-labelledby={headingId}>
      <header className="pf-man-page__head">
        <span id={headingId}>{title}</span>
        <span>{source}</span>
        <span aria-hidden="true">{title}</span>
      </header>
      {stamp && (
        <p className="pf-man-page__stamp">
          {stamp.label}
          {stamp.note !== undefined && <small>{stamp.note}</small>}
        </p>
      )}
      <dl className="pf-man-page__body">
        {sections.map((section) => (
          <div key={section.name}>
            <dt>{section.name}</dt>
            <dd>{section.body}</dd>
          </div>
        ))}
      </dl>
    </article>
  )
}
