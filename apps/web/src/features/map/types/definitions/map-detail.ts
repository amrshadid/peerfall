import type { JourneyNeed, StopState } from './journey'

/** Everything the side panel says about the selected stop. */
export interface MapDetail {
  /** "Stage 4 · Recover from failure · 4.1". */
  readonly place: string
  readonly title: string
  readonly state: StopState
  /** "Available, you are here"; empty when no stop is selected. */
  readonly status: string
  /** The mission in one sentence; null when no stop is selected. */
  readonly objective: string | null
  readonly needs: readonly JourneyNeed[]
  /** "None yet", "3 judged runs". */
  readonly attempts: string
  /** "None", "2 hints". */
  readonly hints: string
  /** "Traffic back within 2 s"; null for a mission without a target. */
  readonly recovery: string | null
  /** `null` while locked. */
  readonly play: { readonly label: string; readonly href: string } | null
  /** Why the stop can't be played, in plain words; null when it can. */
  readonly note: string | null
}
