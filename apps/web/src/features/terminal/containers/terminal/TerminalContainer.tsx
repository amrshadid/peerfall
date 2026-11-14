import { useShortcut } from '@features/shortcuts/hooks/keys'
import { TerminalPresentation } from '@features/terminal/components/terminal'
import { type TerminalView, useTerminalView } from '@features/terminal/hooks/view'
import { clearsTerminal, vmStatusLine } from '@features/terminal/utils/vm'
import { useLinuxTerminal, useMachineStatus, useTerminalSize } from '@peerfall/machine/hooks'
import type { VmPhase } from '@peerfall/machine/types'
import { useMachineLock } from '@shared/hooks/machine'
import { SETTLING_LOCK } from '@shared/utils/machine'
import { useEffect, useRef } from 'react'

export interface TerminalContainerProps {
  /** The mission's network is still being built or its routing is forming: the terminal waits for it. */
  settling?: boolean
}

/** The terminal on the Machine's console: keys go to the selected router's shell, its output comes back as bytes. */
export function TerminalContainer({ settling = false }: TerminalContainerProps) {
  const container = useRef<HTMLDivElement>(null)
  // The Machine's bytes can arrive before the view is made; the view keeps what comes before it opens.
  const view = useRef<TerminalView | null>(null)
  const { phase, detail, send } = useLinuxTerminal((bytes) => view.current?.write(bytes))
  const { resize } = useTerminalSize()
  const machineLock = useMachineLock(useMachineStatus())
  const lock = machineLock ?? (settling ? SETTLING_LOCK : null)
  // While a network is set up or restored the Machine holds keys for the new shell, so they are sent, not dropped.
  const locked = lock !== null && !lock.holdsKeys
  const terminal = useTerminalView(container, { onInput: send, onResize: resize, locked })
  view.current = terminal

  // Start over, a replayed run and a new network replace the shell: its old prompt goes with it.
  const shownPhase = useRef<VmPhase | null>(null)
  useEffect(() => {
    if (clearsTerminal(shownPhase.current, phase)) {
      terminal.clear()
    }
    shownPhase.current = phase
    const line = vmStatusLine(phase, detail)
    if (line !== null) {
      terminal.write(line)
    }
  }, [phase, detail, terminal])

  useShortcut('focus-terminal', terminal.focus)

  return <TerminalPresentation ref={container} lock={lock} />
}
