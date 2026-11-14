import type { MissionDefinition, MissionId } from '#types/definitions/mission'
import type { SkillDefinition, SkillId } from '#types/definitions/skills'

type VisitState = 'visiting' | 'done'

/** Each prerequisite cycle once, as a path that starts and ends on the same skill. */
export function skillCycles(skills: readonly SkillDefinition[]): readonly (readonly SkillId[])[] {
  const byId = new Map(skills.map((skill) => [skill.id, skill]))
  const state = new Map<SkillId, VisitState>()
  const cycles: SkillId[][] = []

  const visit = (id: SkillId, path: readonly SkillId[]): void => {
    const seen = state.get(id)
    if (seen === 'visiting') {
      cycles.push([...path.slice(path.indexOf(id)), id])
      return
    }
    if (seen === 'done' || !byId.has(id)) {
      return
    }
    state.set(id, 'visiting')
    for (const prerequisite of byId.get(id)?.prerequisites ?? []) {
      visit(prerequisite, [...path, id])
    }
    state.set(id, 'done')
  }

  for (const skill of skills) {
    visit(skill.id, [])
  }
  return cycles
}

/** The skills the completed missions have earned. */
export function unlockedSkills(
  missions: readonly Pick<MissionDefinition, 'id' | 'skills'>[],
  completed: ReadonlySet<MissionId> | readonly MissionId[]
): ReadonlySet<SkillId> {
  const done = completed instanceof Set ? completed : new Set(completed)
  return new Set(missions.filter((mission) => done.has(mission.id)).flatMap((mission) => mission.skills))
}

/** A mission opens once every skill it needs is earned. */
export function isMissionOpen(
  mission: Pick<MissionDefinition, 'prerequisites'>,
  unlocked: ReadonlySet<SkillId>
): boolean {
  return mission.prerequisites.every((id) => unlocked.has(id))
}
