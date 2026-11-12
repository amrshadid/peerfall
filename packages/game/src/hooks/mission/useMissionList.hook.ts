import { useMemo } from 'react'
import { getGameConfig } from '#config'
import { useProgressStore } from '#store/progress.store'
import type { MissionDefinition } from '#types/definitions/mission'
import type { ChapterEntry } from '#types/definitions/progress'
import { continueMission, missionList } from '#utils/progress/index'

export interface UseMissionListResult {
  /** Every chapter of the curriculum with its missions and their status; empty until content is loaded. */
  readonly chapters: readonly ChapterEntry[]
  /** Where "Continue" goes; `null` when everything open is done. */
  readonly next: MissionDefinition | null
}

export function useMissionList(): UseMissionListResult {
  const progress = useProgressStore((state) => state.progress)

  return useMemo(() => {
    const { content } = getGameConfig()
    return content
      ? { chapters: missionList(progress, content), next: continueMission(progress, content) }
      : { chapters: [], next: null }
  }, [progress])
}
