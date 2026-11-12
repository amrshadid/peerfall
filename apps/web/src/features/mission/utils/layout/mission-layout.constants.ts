import type { VmPhase } from '@peerfall/machine/types'
import type { RailStep } from '@shared/types'

/** The mission loop, in order: look, say what a change will do, make it, check it. */
export const MISSION_STEPS: readonly RailStep[] = [
  { id: 'inspect', label: 'Inspect' },
  { id: 'predict', label: 'Predict' },
  { id: 'apply', label: 'Apply' },
  { id: 'verify', label: 'Verify' },
]

/** The status bar's word on the Machine. */
export const MACHINE_STATUS: Readonly<Record<VmPhase, string>> = {
  off: 'Linux and FRR: off',
  loading: 'Linux and FRR: loading',
  booting: 'Linux: booting',
  restoring: 'Network: restoring',
  'setting-up': 'Network: starting',
  ready: 'Linux and FRR: running',
  failed: 'Linux and FRR: failed',
}

/** The ids the layout gives its panels: what shortcuts focus and the tour points at. */
export const MISSION_PANEL_IDS = {
  guide: 'mission-guide',
  workspace: 'mission-workspace',
  editor: 'mission-editor',
  terminal: 'mission-terminal',
  network: 'mission-network',
  topology: 'mission-topology',
  timeline: 'mission-timeline',
} as const

/** How far one arrow key moves a divider: a rem for the side panels, five percent for the split. */
export const WIDTH_STEP_REM = 1
export const SPLIT_STEP_PERCENT = 5
