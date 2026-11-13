import type { PanelId, PanelSizes, RailStep, SaveState, ScreenChrome, TitleBlockEntry } from '@shared/types'
import type { ReactNode } from 'react'

export interface MissionTopBarData {
  /** Back to the Peer Map, as Kernelfall's top bar goes back to the Kernel Map. */
  readonly mapHref: string
  /** The mission's name. */
  readonly heading: string
  /** Where it sits in the journey, e.g. "Stage 4 · Recover from failure". */
  readonly subheading: string
  readonly steps: readonly RailStep[]
  /** Index of the current step; `steps.length` once every step is done. */
  readonly currentIndex: number
  /** A done step being looked at again; null on the current one. */
  readonly reviewing: string | null
  onReview(stepId: string): void
  readonly hintsLeft: number
  /** There is a hint worth offering now. */
  readonly hintOffered: boolean
  readonly hintEnabled: boolean
  /** The Hint shortcut as `aria-keyshortcuts` wants it, e.g. `Alt+H`. */
  readonly hintKeyShortcut: string
  onHint(): void
  /** Asks to start the mission again from the network as the mission found it. */
  onRestart(): void
}

/** What goes in each panel. A slot whose panel is locked is not rendered. */
export interface MissionSlots {
  readonly guide: ReactNode
  readonly terminal: ReactNode
  readonly editor: ReactNode
  readonly topology: ReactNode
  readonly timeline: ReactNode
}

/** Which panels the mission has opened so far. The Guide and the terminal are always there. */
export interface MissionPanels {
  readonly editor: boolean
  readonly topology: boolean
  readonly timeline: boolean
}

/** The sizes the player dragged the dividers to, and how to change them. */
export interface PanelLayout {
  readonly sizes: PanelSizes
  /** Null puts the panel back to its default size. */
  readonly onResize: (panel: PanelId, size: number | null) => void
}

export interface ConfirmDialog {
  readonly open: boolean
  /** Why it can't be done right now, said instead of the question; null or left out when it can. */
  readonly unavailable?: string | null
  onConfirm(): void
  onCancel(): void
}

export interface MissionStatusBar {
  readonly save: SaveState
  readonly savedAgoMs: number | null
  /** Where the Machine is, e.g. "Linux and FRR: running". */
  readonly machine: string
  onShortcuts(): void
}

/** Everything the mission screen draws. */
export interface MissionLayoutModel {
  readonly chrome: ScreenChrome
  readonly panelSizes: PanelLayout
  /** The running head's page name, e.g. `The Link That Never Went Down(4.1)`. */
  readonly page: string
  /** The running head's centre line. */
  readonly volume: string
  readonly bar: MissionTopBarData
  readonly panels: MissionPanels
  readonly slots: MissionSlots
  /** Whose shell the terminal is, e.g. "router a". */
  readonly terminalLabel: string
  /** What the Machine is doing or why it failed, or null when there is nothing to say. */
  readonly terminalStatus: string | null
  /** The drawing's title block, under the network: the mission, the step, the target. */
  readonly titleBlock: readonly TitleBlockEntry[]
  /** Laid over the workspace and the network once the mission is judged; null before. */
  readonly debrief: ReactNode | null
  readonly restart: ConfirmDialog
  readonly status: MissionStatusBar
}

/** The steps of a mission's story: Scene, See it, Build it, Watch it, Debrief. */
export type MissionStepId = 'scene' | 'see' | 'build' | 'watch' | 'debrief'

/** What the mission's container hands to the slots that need its run. */
export interface MissionRunView<Run> {
  /** The mission's run on the Machine: its phase, its last verdict, and how to start one. */
  readonly run: Run
  /** The step the player is on. */
  readonly step: MissionStepId
  /** A done step looked back at; null on the current one. */
  readonly reviewing: MissionStepId | null
  /** Ends a look back and returns to the current step. */
  readonly onEndReview: () => void
  /**
   * The network was put back to how the mission found it during this visit: the verdict the game
   * saved before then no longer describes it, so objectives are read from the run alone.
   */
  readonly startedOver: boolean
  /** Goes on to the next step of the story; null where the story moves on by itself or ends. */
  readonly onNext: (() => void) | null
  /** Jumps from the scene straight to Build it; null on other steps. */
  readonly onSkipToBuild: (() => void) | null
  /** Asks before the network goes back to how the mission found it. */
  readonly onStartOver: () => void
  /**
   * Plays the mission again from See it, without asking: the network goes back to how the mission
   * found it and the objectives start unmet. The debrief's Play it again.
   */
  readonly onPlayAgain: () => void
}

export interface MissionUnavailable {
  /** One line on why, in plain words. */
  readonly reason: string
  readonly titleHref: string
}

export interface MissionScreenPresentationProps {
  /** `null` while the mission is being opened. */
  layout: MissionLayoutModel | null
  /** A mission that can't be played gets a plain explanation, never a dead end. */
  unavailable: MissionUnavailable | null
}
