import type { Validated } from '@peerfall/core/types'
import { Issues, reportDuplicates } from '@peerfall/core/utils'
import type { Concept } from '#types/definitions/concepts'
import type { GameContent, GameContentParts } from '#types/definitions/content'
import type { FieldGuide } from '#types/definitions/field-guide'
import type { ChapterDefinition, CodexCard, MissionDefinition, MissionId } from '#types/definitions/mission'

const NO_FIELD_GUIDE: FieldGuide = { entries: [] }

/** Each prerequisite is a mission played earlier, so there is always a first mission to start with. */
function reportPrerequisites(missions: readonly MissionDefinition[], issues: Issues): void {
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
}

/** A chapter the player can reach has a title page and an ending in the Codex. */
function reportChapterPages(
  chapters: readonly ChapterDefinition[],
  missions: readonly MissionDefinition[],
  issues: Issues
) {
  chapters.forEach((chapter, at) => {
    if (!missions.some((mission) => mission.chapter === chapter.id)) {
      return
    }
    for (const field of ['story', 'guide', 'standsFor'] as const) {
      if (chapter[field] === undefined) {
        issues.add(`chapters[${at}].${field}`, 'a chapter with missions needs it for its page in the Codex')
      }
    }
    if (chapter.outcomes.length === 0) {
      issues.add(`chapters[${at}].outcomes`, 'a chapter with missions says what the player can do after it')
    }
  })
}

/** Card ids are unique across the game, and a card deepens one met before it in play order. */
function reportCards(missions: readonly MissionDefinition[], issues: Issues): void {
  const earlier = new Set<string>()
  reportDuplicates(
    missions.flatMap((mission) => mission.codex.map((card) => card.id)),
    'codex',
    issues
  )
  for (const mission of missions) {
    mission.codex.forEach((card, at) => {
      if (card.deepens !== undefined && !earlier.has(card.deepens)) {
        issues.add(
          `missions.${mission.id}.codex[${at}].deepens`,
          `no card "${card.deepens}" earlier in play order to deepen`
        )
      }
      earlier.add(card.id)
    })
  }
}

function reportConcepts(
  missions: readonly MissionDefinition[],
  concepts: readonly Concept[],
  cards: ReadonlyMap<string, unknown>,
  issues: Issues
): void {
  const known = new Set(concepts.map((concept) => concept.id))
  for (const mission of missions) {
    for (const field of ['teaches', 'names', 'uses'] as const) {
      mission[field].forEach((id, at) => {
        if (!known.has(id)) {
          issues.add(`missions.${mission.id}.${field}[${at}]`, `"${id}" is not a concept of concepts.yaml`)
        }
      })
    }
  }
  concepts.forEach((concept, at) => {
    if (concept.codex !== undefined && !cards.has(concept.codex)) {
      issues.add(`concepts[${at}].codex`, `no mission adds a card "${concept.codex}"`)
    }
  })
}

function reportFieldGuide(guide: FieldGuide, missions: readonly MissionDefinition[], issues: Issues): void {
  const exists = (id: MissionId) => missions.some((mission) => mission.id === id)
  guide.entries.forEach((entry, at) => {
    if (!exists(entry.firstMet)) {
      issues.add(`fieldGuide.entries[${at}].firstMet`, `no mission with id "${entry.firstMet}"`)
    }
    entry.deepenedIn.forEach((id, index) => {
      if (!exists(id)) {
        issues.add(`fieldGuide.entries[${at}].deepenedIn[${index}]`, `no mission with id "${id}"`)
      }
    })
  })
}

/**
 * Checks what no single file can: that ids are unique, every mission's chapter exists, each
 * prerequisite is played earlier, card and concept ids resolve, and the Field Guide names real
 * missions.
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
  const concepts = parts.concepts ?? []
  const fieldGuide = parts.fieldGuide ?? NO_FIELD_GUIDE
  const cards = new Map(
    missions.flatMap((mission) =>
      mission.codex.map((card): [string, { card: CodexCard; missionId: MissionId }] => [
        card.id,
        { card, missionId: mission.id },
      ])
    )
  )
  reportPrerequisites(missions, issues)
  reportChapterPages(chapters, missions, issues)
  reportCards(missions, issues)
  if (parts.concepts !== undefined) {
    reportConcepts(missions, concepts, cards, issues)
  }
  reportFieldGuide(fieldGuide, missions, issues)

  const byId = new Map(missions.map((mission): [string, MissionDefinition] => [mission.id, mission]))
  const numbers = new Map(
    chapters.flatMap((chapter) =>
      missions
        .filter((mission) => mission.chapter === chapter.id)
        .map((mission, at): [MissionId, string] => [mission.id, `${chapter.stage}.${at + 1}`])
    )
  )
  const conceptsById = new Map(concepts.map((concept): [string, Concept] => [concept.id, concept]))
  return issues.result({
    chapters,
    missions,
    concepts,
    fieldGuide,
    mission: (id) => byId.get(id),
    missionsIn: (chapter) => missions.filter((mission) => mission.chapter === chapter),
    numberOf: (id) => numbers.get(id),
    concept: (id) => conceptsById.get(id),
    card: (id) => cards.get(id),
  })
}
