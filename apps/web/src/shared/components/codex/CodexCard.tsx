import { Button, InlineText, ManPage } from '@shared/components/ui'
import type { CodexCardData, CodexCardLink, ManPageSection } from '@shared/types'
import { useState } from 'react'
import './CodexCard.css'

export interface CodexCardProps {
  card: CodexCardData
  /** A stamp in the corner, e.g. "Filed". */
  stamp?: { readonly label: string; readonly note?: string }
}

const COPIED_FOR_MS = 1600

function CardLink({ link }: { link: CodexCardLink }) {
  return link.href !== null && link.term !== null ? (
    <a href={link.href}>
      <code>{link.term}</code> <span className="codex-card__number">{link.missionNumber}</span>
    </a>
  ) : (
    <span className="codex-card__blank">a card not found yet, {link.missionNumber}</span>
  )
}

/** A Codex card in the real man page format, so collecting cards teaches reading `man`. */
export function CodexCard({ card, stamp }: CodexCardProps) {
  const [copied, setCopied] = useState(false)
  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      window.setTimeout(() => setCopied(false), COPIED_FOR_MS)
    } catch {
      setCopied(false)
    }
  }

  const sections: ManPageSection[] = [
    { name: 'Name', body: <code>{card.term}</code> },
    { name: 'Simple', body: <InlineText text={card.simple} /> },
    ...(card.deep !== null ? [{ name: 'Deep', body: <InlineText text={card.deep} /> }] : []),
    ...(card.sources.length > 0
      ? [
          {
            name: 'Source',
            body: (
              <span className="codex-card__sources">
                {card.sources.map((source) => (
                  <a key={source.path} href={source.href} target="_blank" rel="noreferrer">
                    <code>{source.path}</code>
                  </a>
                ))}
              </span>
            ),
          },
        ]
      : []),
    ...(card.tryIt !== null
      ? [
          {
            name: 'Try it on a real router',
            body: (
              <div className="codex-card__try">
                <pre>{card.tryIt}</pre>
                <Button size="sm" onClick={() => void copy(card.tryIt ?? '')}>
                  {copied ? 'Copied' : 'Copy'}
                </Button>
              </div>
            ),
          },
        ]
      : []),
    ...(card.docs !== null
      ? [
          {
            name: 'See also',
            body: (
              <a href={card.docs} target="_blank" rel="noreferrer">
                {card.docs.replace(/^https:\/\//, '')}
              </a>
            ),
          },
        ]
      : []),
    ...(card.deepens !== null ? [{ name: 'Deepens', body: <CardLink link={card.deepens} /> }] : []),
    ...(card.deepenedBy.length > 0
      ? [
          {
            name: 'Deepened in',
            body: (
              <ul className="codex-card__list">
                {card.deepenedBy.map((link) => (
                  <li key={`${link.missionNumber}-${link.term ?? ''}`}>
                    <CardLink link={link} />
                  </li>
                ))}
              </ul>
            ),
          },
        ]
      : []),
    { name: 'Filed in', body: card.filedIn },
  ]
  return (
    <ManPage
      title={card.term}
      source="Peerfall Codex"
      sections={sections}
      headingId={`codex-${card.id}`}
      {...(stamp ? { stamp } : {})}
    />
  )
}
