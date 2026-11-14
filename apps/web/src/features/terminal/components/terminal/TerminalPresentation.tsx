import type { MachineLock } from '@shared/types'
import type { Ref } from 'react'
import { MachineLockPlate } from './MachineLockPlate'

export interface TerminalPresentationProps {
  /** The element the terminal opens in: the same ref a container hands to `useTerminalView`. */
  ref: Ref<HTMLDivElement>
  /** Shown over the console while keys can't reach it. */
  lock: MachineLock | null
}

/** No rules, header or label of its own: the page draws them around it. */
export function TerminalPresentation({ ref, lock }: TerminalPresentationProps) {
  return (
    // isolate: the lock plate's z-index stays inside the terminal, under the debrief and dialogs.
    <div className="relative isolate flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-[var(--soft,#e5e5df)] text-[var(--ink,#141414)]">
      {/* The padding sits on xterm's own element: the fit addon subtracts that, not its parent's. */}
      {/* The console is as wide as the box: a box too narrow for 80 columns even at 11px gets fewer, and wraps. */}
      <div
        ref={ref}
        className="min-h-0 min-w-0 flex-1 overflow-hidden [font-family:var(--mono,'IBM_Plex_Mono',ui-monospace,Menlo,monospace)] [&_.xterm]:h-full [&_.xterm]:py-2.5 [&_.xterm]:pl-4"
      />
      {lock && <MachineLockPlate lock={lock} />}
    </div>
  )
}
