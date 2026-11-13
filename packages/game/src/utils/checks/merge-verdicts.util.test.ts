import { describe, expect, it } from 'vitest'
import type { MissionVerdict, ObjectiveVerdict } from '#types/definitions/checks'
import { mergeVerdicts } from '#utils/checks/merge-verdicts.util'

const reach = (objectiveId: string, replies: number): ObjectiveVerdict => ({
  objectiveId,
  result: {
    kind: 'reachable',
    passed: replies > 0,
    failure: replies > 0 ? null : 'unreachable',
    replies,
  },
})

const verdict = (...objectives: ObjectiveVerdict[]): MissionVerdict => ({
  passed: objectives.every((objective) => objective.result.passed),
  objectives,
})

describe('mergeVerdicts', () => {
  it('takes the latest verdict when there is none before it', () => {
    const latest = verdict(reach('a', 0))
    expect(mergeVerdicts(null, latest)).toBe(latest)
  })

  it('keeps an objective met before, and takes the latest result for the others', () => {
    const merged = mergeVerdicts(verdict(reach('a', 3), reach('b', 0)), verdict(reach('a', 0), reach('b', 0)))
    expect(merged).toEqual(verdict(reach('a', 3), reach('b', 0)))
    expect(merged.passed).toBe(false)
  })

  it('passes once every objective has been met by some read', () => {
    const merged = mergeVerdicts(verdict(reach('a', 3), reach('b', 0)), verdict(reach('a', 0), reach('b', 2)))
    expect(merged).toEqual({ passed: true, objectives: [reach('a', 3), reach('b', 2)] })
  })

  it("follows the latest verdict's objectives, so one the mission no longer has is dropped", () => {
    expect(mergeVerdicts(verdict(reach('gone', 3)), verdict(reach('a', 0))).objectives).toEqual([reach('a', 0)])
  })
})
