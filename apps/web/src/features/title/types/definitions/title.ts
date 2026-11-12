import type { LinkStatus } from '@features/topology/types'
import type { NetworkDefinition } from '@peerfall/machine/types'

/** Where the primary button goes, and what it says about it. */
export interface TitleStart {
  readonly href: string
  /** "Start" on a first visit, "Continue" once there is progress. */
  readonly label: string
  /** "Stage 4 · Recover from failure · The Link That Never Went Down". */
  readonly where: string
  /** A second, quieter line, e.g. what the player will do there. */
  readonly note: string
}

/** One stage of the journey through FRR, as the contents list it. */
export interface JourneyStage {
  readonly number: number
  readonly name: string
  /** The FRR parts the stage works with, e.g. "bfdd, graceful restart". */
  readonly parts: string
  /** The stage's first mission, when one is built. */
  readonly missionId: string | null
}

/** Fig. 1: a network drawn as the missions draw it. */
export interface TitleFigure {
  readonly network: NetworkDefinition
  readonly linkStates: readonly LinkStatus[]
  readonly activePath: readonly string[] | null
  /** The figure in one sentence, under it. */
  readonly caption: string
}
