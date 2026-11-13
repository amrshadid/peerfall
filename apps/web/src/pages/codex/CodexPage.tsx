import { CodexContainer } from '@features/codex'
import type { CodexPageId } from '@shared/types'

export interface CodexPageProps {
  cardId: string | null
  chapter: string | null
  page: CodexPageId | null
}

/** `#/codex`: the book of cards, one chapter per stage, with its Field Guide and glossary. */
export function CodexPage({ cardId, chapter, page }: CodexPageProps) {
  return <CodexContainer cardId={cardId} chapter={chapter} page={page} />
}
