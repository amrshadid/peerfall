import type { MissionVerdict } from '#types/definitions/checks'
import type { GameContent } from '#types/definitions/content'
import type { MissionDefinition, MissionId } from '#types/definitions/mission'
import type {
  ChapterEntry,
  EpochMs,
  MissionProgress,
  MissionStatus,
  OpenDebrief,
  Progress,
} from '#types/definitions/progress'
import { MAX_SAVED_ATTEMPTS, type RunComparison, type SavedRun } from '#types/definitions/runs'
import { hintsUsed, nextHint } from '#utils/hints/index'
import { compareRuns } from '#utils/runs/index'

export function emptyProgress(): Progress {
  return { missions: [], completionOrder: [], lastActive: null }
}

export function findMissionProgress(progress: Progress, missionId: MissionId): MissionProgress | undefined {
  return progress.missions.find((record) => record.missionId === missionId)
}

export function isCompleted(progress: Progress, missionId: MissionId): boolean {
  return progress.completionOrder.includes(missionId)
}

export function missionStatus(progress: Progress, mission: MissionDefinition): MissionStatus {
  if (isCompleted(progress, mission.id)) {
    return 'completed'
  }
  if (!mission.prerequisites.every((id) => isCompleted(progress, id))) {
    return 'locked'
  }
  return findMissionProgress(progress, mission.id) ? 'in_progress' : 'available'
}

/** Where "Continue" goes: the mission last played if it isn't done, else the first one open to play. */
export function continueMission(progress: Progress, content: GameContent): MissionDefinition | null {
  const last = progress.lastActive === null ? undefined : content.mission(progress.lastActive)
  if (last && missionStatus(progress, last) === 'in_progress') {
    return last
  }
  const open = content.missions.filter((mission) => {
    const status = missionStatus(progress, mission)
    return status === 'in_progress' || status === 'available'
  })
  return open[0] ?? null
}

/** Every chapter with its missions and how far the player is in each, for the mission list. */
export function missionList(progress: Progress, content: GameContent): readonly ChapterEntry[] {
  return content.chapters.map((chapter) => ({
    chapter,
    missions: content.missionsIn(chapter.id).map((mission) => {
      const record = findMissionProgress(progress, mission.id)
      return {
        mission,
        status: missionStatus(progress, mission),
        attempts: record?.attempts ?? 0,
        hintsUsed: hintsUsed(mission, record?.hintsRevealed ?? 0),
      }
    }),
  }))
}

function withMission(progress: Progress, record: MissionProgress): Progress {
  const exists = progress.missions.some((entry) => entry.missionId === record.missionId)
  return {
    ...progress,
    missions: exists
      ? progress.missions.map((entry) => (entry.missionId === record.missionId ? record : entry))
      : [...progress.missions, record],
  }
}

const freshRecord = (missionId: MissionId, now: EpochMs): MissionProgress => ({
  missionId,
  firstStartedAt: now,
  completedAt: null,
  attempts: 0,
  hintsRevealed: 0,
  runs: [],
})

/** Marks the mission's debrief as open, with the verdict the Guide shows beside it. */
export function openDebrief(progress: Progress, missionId: MissionId, verdict: MissionVerdict | null): Progress {
  return { ...progress, debrief: { missionId, verdict } }
}

/** The player left the debrief through one of its ways on, or went back to play: nothing is open. */
export function closeDebrief(progress: Progress): Progress {
  const { debrief, ...rest } = progress
  return debrief === undefined ? progress : rest
}

/** The open debrief's verdict when it is this mission's and the mission is completed; undefined otherwise. */
export function openDebriefOf(progress: Progress, missionId: MissionId): OpenDebrief | undefined {
  const open = progress.debrief
  return open?.missionId === missionId && isCompleted(progress, missionId) ? open : undefined
}

/** Opens a mission: a first start adds its record; any start makes it where "Continue" goes. */
export function startMission(progress: Progress, missionId: MissionId, now: EpochMs): Progress {
  const record = findMissionProgress(progress, missionId) ?? freshRecord(missionId, now)
  return { ...withMission(progress, record), lastActive: missionId }
}

/**
 * A fresh play-through of a started mission, as Kernelfall's Replay level: its hints are all to
 * ask for again and no debrief stays open. Its completion, attempts and saved runs are kept.
 * Unchanged when the mission was never started.
 */
export function replayMission(progress: Progress, missionId: MissionId): Progress {
  const record = findMissionProgress(progress, missionId)
  if (!record) {
    return progress
  }
  return { ...closeDebrief(withMission(progress, { ...record, hintsRevealed: 0 })), lastActive: missionId }
}

/** Reveals the mission's next hint. `null` when the mission isn't started or nothing is left to reveal. */
export function revealNextHint(progress: Progress, mission: MissionDefinition): Progress | null {
  const record = findMissionProgress(progress, mission.id)
  if (!record || nextHint(mission, record.hintsRevealed) === null) {
    return null
  }
  return withMission(progress, { ...record, hintsRevealed: hintsUsed(mission, record.hintsRevealed) + 1 })
}

/** The one baseline first, then the newest attempts: an older attempt makes room for a newer one. */
function withRun(runs: readonly SavedRun[], run: SavedRun): readonly SavedRun[] {
  const baseline = run.role === 'baseline' ? [run] : runs.filter((saved) => saved.role === 'baseline')
  const attempts = [...runs.filter((saved) => saved.role === 'attempt'), ...(run.role === 'attempt' ? [run] : [])]
  return [...baseline, ...attempts.slice(-MAX_SAVED_ATTEMPTS)]
}

/**
 * Keeps a run. An attempt counts as one more try, and the first one that passes completes the
 * mission. `null` when the mission isn't started.
 */
export function recordRun(progress: Progress, missionId: MissionId, run: SavedRun): Progress | null {
  const record = findMissionProgress(progress, missionId)
  if (!record) {
    return null
  }
  const judged = run.role === 'attempt'
  const completes = judged && run.passed && record.completedAt === null
  const next = withMission(progress, {
    ...record,
    attempts: record.attempts + (judged ? 1 : 0),
    completedAt: completes ? run.savedAt : record.completedAt,
    runs: withRun(record.runs, run),
  })
  return completes && !isCompleted(progress, missionId)
    ? { ...next, completionOrder: [...next.completionOrder, missionId] }
    : next
}

/** A mission's saved runs that are still comparable: made with its current version. */
function currentRuns(progress: Progress, mission: MissionDefinition): readonly SavedRun[] {
  return (findMissionProgress(progress, mission.id)?.runs ?? []).filter((run) => run.missionVersion === mission.version)
}

export function baselineRun(progress: Progress, mission: MissionDefinition): SavedRun | null {
  return currentRuns(progress, mission).find((run) => run.role === 'baseline') ?? null
}

export function latestAttempt(progress: Progress, mission: MissionDefinition): SavedRun | null {
  return currentRuns(progress, mission).findLast((run) => run.role === 'attempt') ?? null
}

/** The run the debrief sets beside the baseline: the latest attempt that passed, else the latest. */
export function repairedRun(progress: Progress, mission: MissionDefinition): SavedRun | null {
  const attempts = currentRuns(progress, mission).filter((run) => run.role === 'attempt')
  return attempts.findLast((run) => run.passed) ?? attempts.at(-1) ?? null
}

/** The saved baseline beside the repaired run, once the player has both. */
export function savedComparison(progress: Progress, mission: MissionDefinition): RunComparison | null {
  const baseline = baselineRun(progress, mission)
  const repaired = repairedRun(progress, mission)
  return baseline && repaired ? compareRuns(baseline.summary, repaired.summary) : null
}
