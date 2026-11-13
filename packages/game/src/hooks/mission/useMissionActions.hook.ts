import { eventBus } from '@peerfall/core/services'
import type { ServiceResponse } from '@peerfall/core/types'
import type { MachineState, StampedMachineEvent } from '@peerfall/machine/types'
import { useMemo } from 'react'
import { getGameConfig, getGameNow } from '#config'
import type { MissionCompletedPayload, MissionStartedPayload, RunRecordedPayload } from '#events/types'
import { GAME_EVENTS } from '#events/types'
import { announceProgress } from '#services/utils/announce-progress.service'
import {
  lockedMissionError,
  noActiveMissionError,
  noContentError,
  notCompletedError,
  unknownMissionError,
} from '#services/utils/error-handling.service'
import { useProgressStore } from '#store/progress.store'
import type { MissionVerdict } from '#types/definitions/checks'
import type { MissionId } from '#types/definitions/mission'
import type { RunRole, RunSummary } from '#types/definitions/runs'
import type { ActiveMission } from '#types/definitions/store'
import { judgeMission, mergeVerdicts } from '#utils/checks/index'
import { hintsUsed } from '#utils/hints/index'
import {
  closeDebrief,
  findMissionProgress,
  isCompleted,
  missionStatus,
  openDebrief,
  openDebriefOf,
  recordRun,
  startMission,
} from '#utils/progress/index'
import { summariseRun } from '#utils/runs/index'

const SOURCE = 'game/mission'

export interface UseMissionActionsResult {
  /** Opens a mission at its incident. Fails for unknown and locked missions. */
  start: (missionId: MissionId) => Promise<ServiceResponse<ActiveMission>>
  /** Incident read: on to the network. */
  begin: () => ServiceResponse<ActiveMission>
  /**
   * How the events so far would be judged, without keeping anything: for ticking objectives live.
   * `state` is the Machine as it was last read, for the checks that read it; without it they are
   * `not_checked`.
   */
  judge: (
    events: readonly StampedMachineEvent[],
    state?: MachineState | null,
    previous?: MissionVerdict | null
  ) => ServiceResponse<MissionVerdict>
  /** Keeps a run of the fault on the network as it was given, to compare the repaired run with. Not judged. */
  saveBaseline: (events: readonly StampedMachineEvent[]) => Promise<ServiceResponse<RunSummary>>
  /**
   * Judges a run, or the player's work as `state` shows it, keeps it, and completes the mission
   * the first time it passes. Retries are free. With `previous`, objectives it met stay met
   * (`mergeVerdicts`), and the merged verdict is what is kept.
   */
  submitRun: (
    events: readonly StampedMachineEvent[],
    state?: MachineState | null,
    previous?: MissionVerdict | null
  ) => Promise<ServiceResponse<MissionVerdict>>
  /**
   * Only once the mission has passed. The debrief stays open in the save, with the verdict, so a
   * reload or a later visit opens the mission at it again, as Kernelfall reopens a level at its card.
   */
  showDebrief: () => Promise<ServiceResponse<ActiveMission>>
  /** The player left the debrief through one of its ways on: the mission no longer opens at it. */
  leaveDebrief: () => Promise<void>
  leave: () => void
}

/** The mission loop's flows. Each one updates the store, emits game events and autosaves. */
export function createMissionActions(): UseMissionActionsResult {
  const store = useProgressStore.getState

  const start = async (missionId: MissionId): Promise<ServiceResponse<ActiveMission>> => {
    const { content } = getGameConfig()
    if (!content) return noContentError()
    const mission = content.mission(missionId)
    if (!mission) return unknownMissionError(missionId)
    if (missionStatus(store().progress, mission) === 'locked') return lockedMissionError(missionId)
    const at = getGameNow()
    const resumed = findMissionProgress(store().progress, missionId) !== undefined
    // A debrief left open comes back with the verdict it was shown with, never the fresh network's.
    const debrief = openDebriefOf(store().progress, missionId)
    const active: ActiveMission = debrief
      ? { mission, phase: 'debrief', verdict: debrief.verdict }
      : { mission, phase: 'incident', verdict: null }
    store().setProgress(startMission(store().progress, missionId, at))
    store().setActive(active)
    eventBus.emit<MissionStartedPayload>(GAME_EVENTS.MISSION_STARTED, { missionId, resumed, at }, { source: SOURCE })
    await announceProgress(SOURCE)
    return { success: true, data: active }
  }

  const moveTo = (phase: ActiveMission['phase']): ServiceResponse<ActiveMission> => {
    const { active } = store()
    if (!active) return noActiveMissionError()
    if (phase === 'debrief' && !isCompleted(store().progress, active.mission.id)) {
      return notCompletedError(active.mission.id)
    }
    const moved = { ...active, phase }
    store().setActive(moved)
    return { success: true, data: moved }
  }

  /** Writes the progress with no debrief open; resolves once saved, at once when none was. */
  const closeOpenDebrief = (): Promise<void> => {
    const { progress } = store()
    if (progress.debrief === undefined) {
      return Promise.resolve()
    }
    store().setProgress(closeDebrief(progress))
    return announceProgress(SOURCE)
  }

  const judge = (
    events: readonly StampedMachineEvent[],
    state: MachineState | null = null,
    previous: MissionVerdict | null = null
  ): ServiceResponse<MissionVerdict> => {
    const { active } = store()
    return active
      ? { success: true, data: mergeVerdicts(previous, judgeMission(active.mission, events, state)) }
      : noActiveMissionError()
  }

  /** Keeps the run in the progress; `null` when no mission is active. */
  const keep = async (
    events: readonly StampedMachineEvent[],
    role: RunRole,
    state: MachineState | null = null,
    previous: MissionVerdict | null = null
  ): Promise<{ summary: RunSummary; verdict: MissionVerdict } | null> => {
    const { active, progress } = store()
    if (!active) return null
    const { mission } = active
    const at = getGameNow()
    const verdict = mergeVerdicts(previous, judgeMission(mission, events, state))
    const summary = summariseRun(events, mission)
    const passed = role === 'attempt' && verdict.passed
    const recorded = recordRun(progress, mission.id, {
      role,
      missionVersion: mission.version,
      savedAt: at,
      passed,
      summary,
    })
    if (!recorded) return null
    store().setProgress(recorded)
    if (role === 'attempt') {
      store().setActive({ ...active, verdict })
    }
    eventBus.emit<RunRecordedPayload>(
      GAME_EVENTS.RUN_RECORDED,
      { missionId: mission.id, role, passed, at },
      { source: SOURCE }
    )
    if (passed && !isCompleted(progress, mission.id)) {
      const record = findMissionProgress(recorded, mission.id)
      eventBus.emit<MissionCompletedPayload>(
        GAME_EVENTS.MISSION_COMPLETED,
        {
          missionId: mission.id,
          attempts: record?.attempts ?? 1,
          hintsUsed: hintsUsed(mission, record?.hintsRevealed ?? 0),
          at,
        },
        { source: SOURCE }
      )
    }
    await announceProgress(SOURCE)
    return { summary, verdict }
  }

  return {
    start,
    // Back into play (Replay from the debrief included): live judging takes over, nothing is left open.
    begin: () => {
      const moved = moveTo('play')
      if (moved.success) {
        void closeOpenDebrief()
      }
      return moved
    },
    judge,
    saveBaseline: async (events) => {
      const kept = await keep(events, 'baseline')
      return kept ? { success: true, data: kept.summary } : noActiveMissionError()
    },
    submitRun: async (events, state = null, previous = null) => {
      const kept = await keep(events, 'attempt', state, previous)
      return kept ? { success: true, data: kept.verdict } : noActiveMissionError()
    },
    showDebrief: async () => {
      const moved = moveTo('debrief')
      if (moved.success && moved.data) {
        store().setProgress(openDebrief(store().progress, moved.data.mission.id, moved.data.verdict))
        await announceProgress(SOURCE)
      }
      return moved
    },
    leaveDebrief: closeOpenDebrief,
    leave: () => store().setActive(null),
  }
}

export function useMissionActions(): UseMissionActionsResult {
  return useMemo(createMissionActions, [])
}
