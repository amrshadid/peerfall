import type { VmPhase } from '@peerfall/machine/types'

export const MACHINE_LOCK_TEXT: Readonly<
  Record<Exclude<VmPhase, 'ready'>, { readonly title: string; readonly detail: string }>
> = {
  off: { title: 'Starting the Machine', detail: 'Waking the emulator.' },
  loading: {
    title: 'Loading the Machine',
    detail: 'Fetching the emulator, Linux and FRR. The first visit downloads the most.',
  },
  booting: { title: 'Booting Linux', detail: 'The kernel is starting; the routers come up after it.' },
  restoring: { title: 'Restoring the Machine', detail: 'Going back to the network as it was when it was healthy.' },
  'setting-up': {
    title: 'Building the network',
    detail: 'Creating the routers and their links, and starting FRR on each router.',
  },
  failed: { title: 'The Machine could not start', detail: 'Reload the page to try again.' },
}

export const HOLDS_KEYS = 'What you type now reaches the shell as soon as it opens.'
export const APPLY_WAITS = 'Apply works once the network is up.'
export const APPLY_FAILED = 'Apply needs a running Machine. Reload the page to try again.'

export const SETTLING_TEXT = {
  title: 'Routers finding each other',
  detail: 'FRR is starting its routing on every router. The terminal opens once routing is quiet.',
} as const

/** The status bar's words, in the mission status bar's "Network: starting" form, for a network not yet there to use. */
export const NETWORK_STATUS_TEXT = {
  building: 'Network: starting',
  settling: 'Network: routers finding each other',
} as const
