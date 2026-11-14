import type { VmPhase } from '@peerfall/machine/types'
import { DIM, RESET, VM_STATUS_LINES } from './vm-status.constants'

/** The terminal line for a VM phase, or null when there is nothing to say. */
export function vmStatusLine(phase: VmPhase, detail: string | null): string | null {
  const line = VM_STATUS_LINES[phase]
  if (line === undefined) {
    return null
  }
  return `${DIM}${detail === null ? line : `${line} ${detail}`}${RESET}\r\n`
}

/** Going back to a saved network or building a new one: the shell on screen is about to be replaced. */
const REPLACES_SHELL: readonly VmPhase[] = ['restoring', 'setting-up']

/**
 * True when a running Machine starts over (Start over, a replayed run, a new network): what the
 * terminal shows belongs to a shell that is gone, and a stale prompt would sit above the new one.
 */
export function clearsTerminal(previous: VmPhase | null, next: VmPhase): boolean {
  return previous === 'ready' && REPLACES_SHELL.includes(next)
}
