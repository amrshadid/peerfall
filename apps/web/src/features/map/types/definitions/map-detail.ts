import type { JourneyNeed, StopState } from './journey'

/** Everything the side panel says about the selected stop. */
export interface MapDetail {
  /** "Stage 4 · Recover from failure · 4.1". */
  readonly place: string
  readonly title: string
  readonly state: StopState
  /** Drawn as not built yet: the stop of a stage with no missions. */
  readonly planned: boolean
  /** "Available, you are here"; empty when no stop is selected. */
  readonly status: string
  /** A mission's objective in one sentence, or what a planned stage covers; null when no stop is selected. */
  readonly about: { readonly term: string; readonly text: string } | null
  /** The FRR daemons and features of the stop's stage. */
  readonly parts: readonly string[]
  /** null for a stop that is not a mission. */
  readonly needs: readonly JourneyNeed[] | null
  /** "None yet", "3 judged runs"; null for a stop that is not a mission. */
  readonly attempts: string | null
  /** "None", "2 hints"; null for a stop that is not a mission. */
  readonly hints: string | null
  /** "Traffic back within 2 s"; null for a mission without a target. */
  readonly recovery: string | null
  /** `null` while locked or not built. */
  readonly play: { readonly label: string; readonly href: string } | null
  /** Why the stop can't be played, in plain words; null when it can. */
  readonly note: string | null
}
