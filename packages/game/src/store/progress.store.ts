import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { EpochMs, Progress } from '#types/definitions/progress'
import type { SaveIssue } from '#types/definitions/saves'
import type { ActiveMission, GameStatus } from '#types/definitions/store'
import { GAME_STATUS } from '#types/definitions/store'
import { emptyProgress } from '#utils/progress/index'

interface ProgressState {
  status: GameStatus
  /** Missions completed, hints used and saved runs. */
  progress: Progress
  /** The mission being played, or null. */
  active: ActiveMission | null
  /** Saves written but not finished yet. */
  pendingSaves: number
  /** When the loaded or last written save was made. */
  lastSavedAt: EpochMs | null
  saveIssue: SaveIssue | null
  /** Advances when the progress is replaced (open, import, reset); async work drops a stale result. */
  epoch: number
}

interface ProgressActions {
  opening: () => void
  open: (progress: Progress, lastSavedAt: EpochMs | null, saveIssue: SaveIssue | null) => void
  setProgress: (progress: Progress) => void
  setActive: (active: ActiveMission | null) => void
  saveStarted: () => void
  saveFinished: (savedAt: EpochMs | null, saveIssue: SaveIssue | null) => void
  /** A save that wasn't attempted, and why. */
  saveSkipped: (saveIssue: SaveIssue) => void
  reset: () => void
}

type ProgressStore = ProgressState & ProgressActions

const initialState: ProgressState = {
  status: GAME_STATUS.closed,
  progress: emptyProgress(),
  active: null,
  pendingSaves: 0,
  lastSavedAt: null,
  saveIssue: null,
  epoch: 0,
}

export const useProgressStore = create<ProgressStore>()(
  devtools(
    (set, get) => ({
      ...initialState,

      opening: () => set({ status: GAME_STATUS.opening, epoch: get().epoch + 1 }),

      // Keeps pendingSaves: writes already queued still finish and report back.
      open: (progress, lastSavedAt, saveIssue) =>
        set({ status: GAME_STATUS.open, progress, active: null, lastSavedAt, saveIssue, epoch: get().epoch + 1 }),

      setProgress: (progress) => set({ progress }),

      setActive: (active) => set({ active }),

      saveStarted: () => set({ pendingSaves: get().pendingSaves + 1 }),

      saveFinished: (savedAt, saveIssue) =>
        set({
          pendingSaves: Math.max(0, get().pendingSaves - 1),
          lastSavedAt: savedAt ?? get().lastSavedAt,
          saveIssue,
        }),

      saveSkipped: (saveIssue) => set({ saveIssue }),

      // The epoch keeps counting across resets, so work started before one still sees it as stale.
      reset: () => set({ ...initialState, epoch: get().epoch + 1 }),
    }),
    { name: 'ProgressStore' }
  )
)
