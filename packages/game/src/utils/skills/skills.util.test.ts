import { describe, expect, it } from 'vitest'
import { EXAMPLE_MISSION, FOLLOW_UP_MISSION } from '#test/index'
import type { SkillDefinition } from '#types/definitions/skills'
import { isMissionOpen, skillCycles, unlockedSkills } from '#utils/skills/skills.util'

const skill = (id: string, ...prerequisites: string[]): SkillDefinition => ({
  id,
  title: id,
  region: 'r',
  prerequisites,
})

describe('skills', () => {
  it('finds each cycle once, a skill that needs itself included', () => {
    expect(skillCycles([skill('a', 'c'), skill('b', 'a'), skill('c', 'b'), skill('d')])).toEqual([['a', 'c', 'b', 'a']])
    expect(skillCycles([skill('a', 'a')])).toEqual([['a', 'a']])
    expect(skillCycles([skill('a'), skill('b', 'a', 'ghost')])).toEqual([])
  })

  it('opens a mission once the completed missions have earned every skill it needs', () => {
    const missions = [EXAMPLE_MISSION, FOLLOW_UP_MISSION]
    const none = unlockedSkills(missions, [])
    expect(isMissionOpen(EXAMPLE_MISSION, none)).toBe(true)
    expect(isMissionOpen(FOLLOW_UP_MISSION, none)).toBe(false)

    const first = unlockedSkills(missions, new Set([EXAMPLE_MISSION.id]))
    expect(first).toEqual(new Set(['bfd-fast-detection']))
    expect(isMissionOpen(FOLLOW_UP_MISSION, first)).toBe(true)
  })
})
