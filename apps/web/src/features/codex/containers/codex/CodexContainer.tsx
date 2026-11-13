import { useScreenChrome } from '@features/chrome/hooks/screen'
import { CodexPresentation } from '@features/codex/components/codex'
import type { CodexTab } from '@features/codex/types'
import { codexIndexOf, codexPageOf, fieldGuideRowsOf, glossaryRowsOf } from '@features/codex/utils/book'
import { useContent } from '@features/content/hooks/content'
import { useCodex, useFieldGuide } from '@peerfall/game/hooks'
import { hrefOf, navigateTo } from '@shared/navigation'
import type { CodexPageId } from '@shared/types'

export interface CodexContainerProps {
  /** From the address: the card, chapter or page the Codex is open at. */
  cardId: string | null
  chapter: string | null
  page: CodexPageId | null
}

export function CodexContainer({ cardId, chapter, page }: CodexContainerProps) {
  const chrome = useScreenChrome()
  const content = useContent()
  const codex = useCodex()
  const fieldGuide = useFieldGuide()

  const label = (missionId: string) => {
    const mission = content.game.mission(missionId)
    return [content.game.numberOf(missionId), mission?.title ?? missionId].filter(Boolean).join(' ')
  }
  const selection = { cardId, chapterId: chapter }
  const tab: CodexTab = page ?? 'cards'

  return (
    <CodexPresentation
      chrome={chrome}
      backHref={hrefOf({ name: 'title' })}
      filed={codex.filed}
      total={codex.total}
      chapters={codexIndexOf(codex, selection)}
      page={codexPageOf(codex, selection, label)}
      fieldGuide={fieldGuide.open ? fieldGuideRowsOf(fieldGuide.entries, label) : null}
      glossary={codex.glossary.length > 0 ? glossaryRowsOf(codex.glossary) : null}
      tab={tab}
      onTab={(next) =>
        navigateTo(next === 'cards' ? { name: 'codex', cardId } : { name: 'codex', cardId: null, page: next })
      }
    />
  )
}
