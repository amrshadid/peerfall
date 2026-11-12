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
