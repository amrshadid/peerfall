import type { Validated } from '@peerfall/core/types'
import { Issues, ObjectReader } from '@peerfall/core/utils'
import { KEBAB_ID } from '#types/definitions/mission'
import type { SkillDefinition } from '#types/definitions/skills'

const SKILL_KEYS = ['id', 'title', 'region', 'prerequisites'] as const

/**
 * Checks a parsed `skills.yaml`, one skill at a time. The tree as a whole (repeated and unknown
 * ids, cycles, a skill no mission earns) is checked with the rest of the content, by
 * `createGameContent`.
 */
export function validateSkills(raw: unknown): Validated<readonly SkillDefinition[]> {
  const issues = new Issues()
  const reader = new ObjectReader(raw, '', issues)
  reader.rejectUnknownKeys(['skills'])
  const skills = reader.list('skills', (value, path): SkillDefinition => {
    const skill = new ObjectReader(value, path, issues)
    skill.rejectUnknownKeys(SKILL_KEYS)
    return {
      id: skill.string('id', KEBAB_ID),
      title: skill.string('title'),
      region: skill.string('region', KEBAB_ID),
      prerequisites: skill.has('prerequisites') ? skill.stringList('prerequisites', KEBAB_ID) : [],
    }
  })
  return issues.result(skills)
}
