import { expect, it } from 'vitest'
import type { GoldenMission } from '#test/golden-mission'

/** What each golden run meets, objective by objective, keyed by the run's id in solution.yaml. */
export type ExpectedRuns = Readonly<Record<string, Readonly<Record<string, boolean>>>>

/**
 * The tests every mission's golden runs share: each run of `expected` is recorded for this
 * version, is judged as solution.yaml says, and meets exactly the objectives it lists.
 */
export function itJudgesEveryRun(golden: GoldenMission, expected: ExpectedRuns): void {
  it('has every golden run, recorded for this version of the mission', () => {
    expect(golden.runs.map((recorded) => recorded.run).sort()).toEqual(Object.keys(expected).sort())
    for (const recorded of golden.runs) {
      expect([recorded.run, recorded.version]).toEqual([recorded.run, golden.mission.version])
    }
  })

  it('judges every run as its solution says', () => {
    for (const recorded of golden.runs) {
      expect([recorded.run, golden.verdict(recorded.run).passed]).toEqual([recorded.run, recorded.passes])
    }
  })

  for (const [id, objectives] of Object.entries(expected)) {
    it(`${id}: meets ${
      Object.entries(objectives)
        .filter(([, met]) => met)
        .map(([objective]) => objective)
        .join(', ') || 'no objective'
    }`, () => {
      expect(golden.objectives(id)).toEqual(objectives)
    })
  }
}
