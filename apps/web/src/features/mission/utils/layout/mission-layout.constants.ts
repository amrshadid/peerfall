import type { MissionStepId } from '@features/mission/types'
import type { VmPhase } from '@peerfall/machine/types'
import type { RailStep } from '@shared/types'

/** The mission's story, in order, as the step rail shows it (Kernelfall's loop, its Card read as the debrief). */
export const MISSION_STEPS: readonly (RailStep & { readonly id: MissionStepId })[] = [
  { id: 'scene', label: 'Scene' },
  { id: 'see', label: 'See it' },
  { id: 'build', label: 'Build it' },
  { id: 'watch', label: 'Watch it' },
  { id: 'debrief', label: 'Debrief' },
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
