import type { Validated } from '@peerfall/core/types'
import { Issues, reportDuplicates } from '@peerfall/core/utils'
import type { Concept } from '#types/definitions/concepts'
import type { GameContent, GameContentParts } from '#types/definitions/content'
import type { FieldGuide } from '#types/definitions/field-guide'
import type { ChapterDefinition, CodexCard, MissionDefinition, MissionId } from '#types/definitions/mission'
import type { SkillDefinition, SkillId } from '#types/definitions/skills'
import { skillCycles } from '#utils/skills/index'

const NO_FIELD_GUIDE: FieldGuide = { entries: [] }

/**
 * Each skill a mission needs is earned by a mission played earlier, so there is always a first
 * mission to start with; and each skill is earned by one mission only.
 */
function reportPrerequisites(missions: readonly MissionDefinition[], issues: Issues): void {
  const earners = (id: SkillId) => missions.filter((mission) => mission.skills.includes(id))
  missions.forEach((mission, at) => {
    mission.skills.forEach((id, index) => {
      const other = earners(id).find((candidate) => candidate.id !== mission.id)
      if (other && missions.indexOf(other) < at) {
        issues.add(`missions.${mission.id}.skills[${index}]`, `"${id}" is already earned in "${other.id}"`)
      }
    })
    mission.prerequisites.forEach((id, index) => {
      const path = `missions.${mission.id}.prerequisites[${index}]`
      const earner = earners(id)[0]
      if (earner === undefined) {
        issues.add(path, `no mission earns the skill "${id}"`)
      } else if (missions.indexOf(earner) >= at) {
        issues.add(path, `"${id}" is earned in "${earner.id}", played after this mission, so it could never open`)
      }
    })
  })
}

/**
 * A chapter's regions hold each of its missions once, in play order. A chapter with no regions is
 * left whole: the loader wants regions for the game's own content, a test needs none.
 */
function reportRegions(chapters: readonly ChapterDefinition[], missions: readonly MissionDefinition[], issues: Issues) {
  reportDuplicates(
    chapters.flatMap((chapter) => chapter.regions.map((region) => region.id)),
    'regions',
    issues
  )
  chapters.forEach((chapter, at) => {
    if (chapter.regions.length === 0) {
      return
    }
    const own = missions.filter((mission) => mission.chapter === chapter.id).map((mission) => mission.id)
    chapter.regions.forEach((region, index) => {
      region.missions.forEach((id, place) => {
        if (!own.includes(id)) {
          issues.add(`chapters[${at}].regions[${index}].missions[${place}]`, `"${id}" is not a mission of this chapter`)
        }
      })
    })
    const listed = chapter.regions.flatMap((region) => region.missions)
    for (const id of own.filter((mission) => !listed.includes(mission))) {
      issues.add(`chapters[${at}].regions`, `the mission "${id}" is in none of the chapter's regions`)
    }
    const inOrder = listed.filter((id) => own.includes(id))
    if (inOrder.length === own.length && inOrder.some((id, place) => own[place] !== id)) {
      issues.add(`chapters[${at}].regions`, `the regions list the missions out of play order: ${own.join(', ')}`)
    }
  })
}

/**
 * The skill tree: ids are unique, every id a skill or a mission names exists, no skill needs
 * itself through others, each skill is earned by a mission, and in the region it belongs to.
 */
function reportSkills(
  skills: readonly SkillDefinition[],
  chapters: readonly ChapterDefinition[],
  missions: readonly MissionDefinition[],
  issues: Issues
) {
  reportDuplicates(
    skills.map((skill) => skill.id),
    'skills',
    issues
  )
  const known = new Set(skills.map((skill) => skill.id))
  const regions = chapters.flatMap((chapter) => chapter.regions)
  skills.forEach((skill, at) => {
    skill.prerequisites.forEach((id, index) => {
      if (!known.has(id)) {
        issues.add(`skills[${at}].prerequisites[${index}]`, `no skill with id "${id}"`)
      }
    })
    const region = regions.find((candidate) => candidate.id === skill.region)
    const earner = missions.find((mission) => mission.skills.includes(skill.id))
    if (region === undefined) {
      issues.add(`skills[${at}].region`, `no region with id "${skill.region}"`)
    } else if (earner && !region.missions.includes(earner.id)) {
      issues.add(`skills[${at}].region`, `"${skill.id}" is earned in "${earner.id}", which is not in "${region.id}"`)
    }
    if (earner === undefined) {
      issues.add(`skills[${at}]`, `no mission earns "${skill.id}"`)
    }
  })
  for (const mission of missions) {
    for (const field of ['skills', 'prerequisites'] as const) {
      mission[field].forEach((id, index) => {
        if (!known.has(id)) {
          issues.add(`missions.${mission.id}.${field}[${index}]`, `"${id}" is not a skill of skills.yaml`)
        }
      })
    }
  }
  for (const cycle of skillCycles(skills)) {
    issues.add('skills', `prerequisite cycle: ${cycle.join(' → ')}`)
  }
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
 * Checks what no single file can: that ids are unique, every mission's chapter exists and it sits
 * in one of its regions, each skill it needs is earned earlier, the skill tree holds together,
 * card and concept ids resolve, and the Field Guide names real missions.
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
  const skills = parts.skills ?? []
  reportPrerequisites(missions, issues)
  reportRegions(chapters, missions, issues)
  if (parts.skills !== undefined) {
    reportSkills(skills, chapters, missions, issues)
  }
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
  const skillsById = new Map(skills.map((skill): [SkillId, SkillDefinition] => [skill.id, skill]))
  return issues.result({
    chapters,
    missions,
    concepts,
    fieldGuide,
    skills,
    mission: (id) => byId.get(id),
    skill: (id) => skillsById.get(id),
    earnedIn: (id) => missions.find((mission) => mission.skills.includes(id)),
    missionsIn: (chapter) => missions.filter((mission) => mission.chapter === chapter),
    numberOf: (id) => numbers.get(id),
    concept: (id) => conceptsById.get(id),
    card: (id) => cards.get(id),
  })
}
