import type { MissionDefinition, MissionVerdict } from '@peerfall/game/types'
import { judgeMission } from '@peerfall/game/utils'
import { type RecordedRun, recordedRuns } from '#test/recorded-runs'
import { appContent } from '#utils/loader/app-content.util'

/** A mission and its recorded golden runs, for the test that judges them again without a VM. */
export interface GoldenMission {
  readonly mission: MissionDefinition
  /** Every recorded run, by file name. */
  readonly runs: readonly RecordedRun[]
  /** One run by its id in solution.yaml; throws when it was never recorded. */
  readonly run: (id: string) => RecordedRun
  /** The run judged by the mission's own checks, from its recorded events and state. */
  readonly verdict: (id: string) => MissionVerdict
  /** Each objective's id with whether the run met it. */
  readonly objectives: (id: string) => Readonly<Record<string, boolean>>
}

export function goldenMission(missionId: string): GoldenMission {
  const loaded = appContent()
  const mission = loaded.ok ? loaded.value.game.mission(missionId) : undefined
  if (!mission) {
    throw new Error(loaded.ok ? `no mission ${missionId}` : loaded.errors.join('\n'))
  }
  const runs = recordedRuns(missionId)
  const run = (id: string): RecordedRun => {
    const found = runs.find((recorded) => recorded.run === id)
    if (!found) {
      throw new Error(`no recorded run ${missionId}/${id}: run pnpm --filter @peerfall/missions vm:golden ${missionId}`)
    }
    return found
  }
  const verdict = (id: string): MissionVerdict => {
    const recorded = run(id)
    return judgeMission(mission, recorded.events, recorded.state ?? null)
  }
  return {
    mission,
    runs,
    run,
    verdict,
    objectives: (id) =>
      Object.fromEntries(verdict(id).objectives.map(({ objectiveId, result }) => [objectiveId, result.passed])),
  }
}
