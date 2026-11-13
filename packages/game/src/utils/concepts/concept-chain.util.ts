import { type ConceptId, type ConceptViolation, FOUNDATION_STAGES } from '#types/definitions/concepts'
import type { GameContent } from '#types/definitions/content'
import type { MissionId } from '#types/definitions/mission'

/**
 * Walks the missions in play order and lists every break: a concept used before a mission names
 * or teaches it, a concept taught twice, and a concept of the first stages that no later mission
 * uses or teaches again.
 */
export function conceptChain(content: Pick<GameContent, 'chapters' | 'missions'>): ConceptViolation[] {
  const { missions } = content
  const stageOf = new Map(content.chapters.map((chapter) => [chapter.id, chapter.stage]))
  const violations: ConceptViolation[] = []
  const teacherOf = new Map<ConceptId, MissionId>()
  const lastSeen = new Map<ConceptId, number>()
  missions.forEach((mission, at) => {
    for (const concept of mission.teaches) {
      teacherOf.set(concept, teacherOf.get(concept) ?? mission.id)
    }
    for (const concept of [...mission.teaches, ...mission.names, ...mission.uses]) {
      lastSeen.set(concept, at)
    }
  })

  const met = new Set<ConceptId>()
  const taught = new Set<ConceptId>()
  missions.forEach((mission, at) => {
    for (const concept of mission.uses) {
      if (!met.has(concept)) {
        violations.push({
          kind: 'used-before-taught',
          concept,
          missionId: mission.id,
          other: teacherOf.get(concept) ?? null,
        })
      }
    }
    for (const concept of mission.teaches) {
      if (taught.has(concept)) {
        violations.push({ kind: 'taught-twice', concept, missionId: mission.id, other: teacherOf.get(concept) ?? null })
        continue
      }
      taught.add(concept)
    }
    const foundation = (stageOf.get(mission.chapter) ?? Number.POSITIVE_INFINITY) <= FOUNDATION_STAGES
    for (const concept of [...mission.teaches, ...mission.names]) {
      if (met.has(concept)) {
        continue
      }
      met.add(concept)
      if (foundation && lastSeen.get(concept) === at) {
        violations.push({ kind: 'never-used-again', concept, missionId: mission.id, other: null })
      }
    }
  })
  return violations
}
