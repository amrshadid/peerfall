import type { PanelId, PanelSizes, RailStep, SaveState, ScreenChrome, TitleBlockEntry } from '@shared/types'
import type { ReactNode } from 'react'

export interface MissionTopBarData {
  readonly titleHref: string
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
  /** Asks to start the mission again from the healthy network. */
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
