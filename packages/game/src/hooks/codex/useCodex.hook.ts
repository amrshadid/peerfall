import { useMemo } from 'react'
import { getGameConfig } from '#config'
import { useProgressStore } from '#store/progress.store'
import type { CodexView } from '#types/definitions/codex'
import { codexView } from '#utils/codex/index'

const EMPTY_CODEX: CodexView = { chapters: [], glossary: [], filed: 0, total: 0 }

/** The whole Codex by stage, in play order, with each card filed, seen or hidden for the player, and the glossary. */
export function useCodex(): CodexView {
  const progress = useProgressStore((state) => state.progress)
  return useMemo(() => {
    const { content } = getGameConfig()
    return content ? codexView(progress, content) : EMPTY_CODEX
  }, [progress])
}
