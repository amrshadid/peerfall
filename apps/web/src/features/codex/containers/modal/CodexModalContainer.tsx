import { CodexModalPresentation } from '@features/codex/components/modal'
import { useCodexModal } from '@features/codex/hooks/modal'
import { cardDataOf } from '@features/codex/utils/book'
import { useContent } from '@features/content/hooks/content'
import { useCodex } from '@peerfall/game/hooks'

export interface CodexModalContainerProps {
  missionId: string
  /** The card named in the address; one the mission doesn't file opens nothing. */
  cardId: string | null
}

/** A card of the mission, open over it from the Guide's Codex chips. */
export function CodexModalContainer({ missionId, cardId }: CodexModalContainerProps) {
  const content = useContent()
  const codex = useCodex()
  const { close } = useCodexModal(missionId, cardId)
  const entry =
    cardId === null
      ? undefined
      : codex.chapters
          .flatMap((chapter) => chapter.cards)
          .find((candidate) => candidate.card.id === cardId && candidate.missionId === missionId)
  const label = (id: string) =>
    [content.game.numberOf(id), content.game.mission(id)?.title ?? id].filter(Boolean).join(' ')
  return <CodexModalPresentation open={entry ? cardDataOf(entry, label) : null} onClose={close} />
}
