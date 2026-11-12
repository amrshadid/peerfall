import type { VmPhase, VmStatus } from '@peerfall/machine/types'
import type { MachineLock } from '@shared/types'
import { APPLY_FAILED, APPLY_WAITS, HOLDS_KEYS, MACHINE_LOCK_TEXT } from './machine-lock.constants'

// The Machine holds the terminal's keys while it sets a network up or goes back to a saved one.
const HOLDING: readonly VmPhase[] = ['restoring', 'setting-up']

/** Null once the shell is at its prompt; `wasReady` is true once the Machine has been ready since the page opened. */
export function machineLockOf({ phase, detail }: VmStatus, wasReady: boolean): MachineLock | null {
  if (phase === 'ready') {
    return null
  }
  const text = MACHINE_LOCK_TEXT[phase]
  const failed = phase === 'failed'
  // Before the first boot is done there is no shell for the keys to wait for.
  const holdsKeys = wasReady && HOLDING.includes(phase)
  return {
    phase,
    title: text.title,
    detail: detail ?? (holdsKeys ? `${text.detail} ${HOLDS_KEYS}` : text.detail),
    failed,
    holdsKeys,
    applyReason: failed ? APPLY_FAILED : `${text.title}. ${APPLY_WAITS}`,
  }
}
