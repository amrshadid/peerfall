import type { ContentsEntry } from '@shared/types'
import './ContentsList.css'

export interface ContentsListProps {
  headingId: string
  heading: string
  entries: readonly ContentsEntry[]
}

export function ContentsList({ headingId, heading, entries }: ContentsListProps) {
  return (
    <div className="pf-contents">
      <h2 id={headingId}>{heading}</h2>
      <ul aria-labelledby={headingId}>
        {entries.map((entry) => (
          <li key={entry.id}>
            <ContentsLine entry={entry} />
          </li>
        ))}
      </ul>
    </div>
  )
}

function ContentsLine({ entry }: { entry: ContentsEntry }) {
  const inner = (
    <>
      <span className="pf-contents__name">{entry.name}</span>
      <span className="pf-contents__leader" aria-hidden="true" />
      <span className="pf-contents__ref">{entry.reference}</span>
    </>
  )
  if (entry.href !== undefined) {
    return (
      <a className="pf-contents__line" href={entry.href}>
        {inner}
      </a>
    )
  }
  if (entry.onSelect !== undefined) {
    return (
      <button type="button" className="pf-contents__line" onClick={entry.onSelect}>
        {inner}
      </button>
    )
  }
  // A page that isn't written yet is listed, not linked: nothing to press that leads nowhere.
  return <span className="pf-contents__line pf-contents__line--plain">{inner}</span>
}
