import type { VmPhase } from '@peerfall/machine/types'

/** Why the Machine can't take a command yet: the terminal and Apply wait for `ready`. */
export interface MachineLock {
  /** The Machine's phase, or `settling`: the Machine is ready and the mission's routing is still forming. */
  readonly phase: Exclude<VmPhase, 'ready'> | 'settling'
  /** e.g. "Booting Linux". */
  readonly title: string
  /** The status's own words, or a line about the phase. */
  readonly detail: string | null
  readonly failed: boolean
  /** Keys typed now wait in the Machine for the shell it is about to start, and reach it in order. */
  readonly holdsKeys: boolean
  /** Why Apply is off, for its title and screen readers. */
  readonly applyReason: string
}
