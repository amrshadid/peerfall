import { useShortcut } from '@features/shortcuts/hooks/keys'
import { TerminalPresentation } from '@features/terminal/components/terminal'
import { type TerminalView, useTerminalView } from '@features/terminal/hooks/view'
import { vmStatusLine } from '@features/terminal/utils/vm'
import { useLinuxTerminal, useMachineStatus, useTerminalSize } from '@peerfall/machine/hooks'
import { useMachineLock } from '@shared/hooks/machine'
import { useEffect, useRef } from 'react'

/** The terminal on the Machine's console: keys go to the selected router's shell, its output comes back as bytes. */
export function TerminalContainer() {
  const container = useRef<HTMLDivElement>(null)
  // The Machine's bytes can arrive before the view is made; the view keeps what comes before it opens.
  const view = useRef<TerminalView | null>(null)
  const { phase, detail, send } = useLinuxTerminal((bytes) => view.current?.write(bytes))
  const { resize } = useTerminalSize()
  const lock = useMachineLock(useMachineStatus())
  // While a network is set up or restored the Machine holds keys for the new shell, so they are sent, not dropped.
  const locked = lock !== null && !lock.holdsKeys
  const terminal = useTerminalView(container, { onInput: send, onResize: resize, locked })
  view.current = terminal

  useEffect(() => {
    const line = vmStatusLine(phase, detail)
    if (line !== null) {
      terminal.write(line)
    }
  }, [phase, detail, terminal])

  useShortcut('focus-terminal', terminal.focus)

  return <TerminalPresentation ref={container} lock={lock} />
}
