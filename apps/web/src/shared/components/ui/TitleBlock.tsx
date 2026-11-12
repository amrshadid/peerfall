import type { TitleBlockEntry } from '@shared/types'
import './TitleBlock.css'

export interface TitleBlockProps {
  entries: readonly TitleBlockEntry[]
  label?: string
}

export function TitleBlock({ entries, label = 'Title block' }: TitleBlockProps) {
  return (
    <dl className="pf-title-block" aria-label={label}>
      {entries.map((entry) => (
        <div key={entry.label} className={entry.tone ? `pf-title-block--${entry.tone}` : undefined}>
          <dt>{entry.label}</dt>
          <dd>{entry.value}</dd>
        </div>
      ))}
    </dl>
  )
}
