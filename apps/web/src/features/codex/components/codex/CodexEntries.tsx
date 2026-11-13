import type { CodexEntry } from '@features/codex/types'

export interface CodexEntriesProps {
  entries: readonly CodexEntry[]
  /** The index's compact list, or the title page's fuller one. */
  variant: 'index' | 'page'
}

const STATE_WORD = { filed: 'filed', seen: 'seen', blank: 'not found yet' } as const

/** A chapter's cards in teaching order; one not found yet is a blank outline with its mission number. */
export function CodexEntries({ entries, variant }: CodexEntriesProps) {
  return (
    <ul className={`codex-entries codex-entries--${variant}`}>
      {entries.map((entry) => (
        <li key={entry.key}>
          {entry.href !== null && entry.term !== null ? (
            <a
              href={entry.href}
              aria-current={entry.current ? 'page' : undefined}
              className={`codex__entry codex__entry--${entry.state}`}
            >
              <code>{entry.term}</code>
              <span>
                {entry.missionNumber} · {STATE_WORD[entry.state]}
              </span>
            </a>
          ) : (
            <span className="codex__entry codex__entry--blank">
              <span className="codex__outline" aria-hidden="true" />
              <span>
                {entry.missionNumber} · {STATE_WORD.blank}
              </span>
            </span>
          )}
        </li>
      ))}
    </ul>
  )
}
