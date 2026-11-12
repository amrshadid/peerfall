import type { Validated } from '@peerfall/core/types'
import { Issues, reportDuplicates } from '@peerfall/core/utils'
import type { GameContent, GameContentParts } from '#types/definitions/content'
import type { MissionDefinition } from '#types/definitions/mission'

/**
 * Checks what no single file can: that ids are unique, every mission's chapter exists, and each
 * prerequisite is a mission played earlier (so there is always a first mission to start with).
 */
export function createGameContent(parts: GameContentParts): Validated<GameContent> {
  const issues = new Issues()
  const { chapters } = parts
  reportDuplicates(
    chapters.map((chapter) => chapter.id),
    'chapters',
    issues
  )
  reportDuplicates(
    parts.missions.map((mission) => mission.id),
    'missions',
    issues
  )
  for (const mission of parts.missions) {
    if (!chapters.some((chapter) => chapter.id === mission.chapter)) {
      issues.add(`missions.${mission.id}.chapter`, `no chapter with id "${mission.chapter}"`)
    }
  }
  const missions = chapters.flatMap((chapter) => parts.missions.filter((mission) => mission.chapter === chapter.id))
  missions.forEach((mission, at) => {
    mission.prerequisites.forEach((id, index) => {
      const path = `missions.${mission.id}.prerequisites[${index}]`
      const found = missions.findIndex((candidate) => candidate.id === id)
      if (found === -1) {
        issues.add(path, `no mission with id "${id}"`)
      } else if (found >= at) {
        issues.add(path, `"${id}" is played after this mission, so it could never be unlocked`)
      }
    })
  })
  const byId = new Map(missions.map((mission): [string, MissionDefinition] => [mission.id, mission]))
  return issues.result({
    chapters,
    missions,
    mission: (id) => byId.get(id),
    missionsIn: (chapter) => missions.filter((mission) => mission.chapter === chapter),
  })
}
