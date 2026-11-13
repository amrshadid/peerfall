import { useMemo } from 'react'
import { getGameConfig } from '#config'
import { useProgressStore } from '#store/progress.store'
import type { FieldGuideView } from '#types/definitions/field-guide'
import { fieldGuideView } from '#utils/field-guide/index'

const CLOSED: FieldGuideView = { open: false, entries: [] }

/** The Codex's Field Guide page: whether it's open yet, and the commands met so far. */
export function useFieldGuide(): FieldGuideView {
  const progress = useProgressStore((state) => state.progress)
  return useMemo(() => {
    const { content } = getGameConfig()
    return content ? fieldGuideView(content, progress) : CLOSED
  }, [progress])
}
