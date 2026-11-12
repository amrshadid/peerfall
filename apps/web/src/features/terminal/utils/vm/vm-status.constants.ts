import type { VmPhase } from '@peerfall/machine/types'

/** What the terminal says while the Machine starts; a ready shell speaks for itself. */
export const VM_STATUS_LINES: Partial<Record<VmPhase, string>> = {
  loading: 'Loading the Machine: the emulator, Linux and FRR…',
  booting: 'Booting Linux…',
  'setting-up': 'Building the network and starting FRR on each router…',
  failed: 'The Machine could not start:',
}

/** Dim text, then back to normal. */
export const DIM = '\x1b[2m'
export const RESET = '\x1b[0m'
