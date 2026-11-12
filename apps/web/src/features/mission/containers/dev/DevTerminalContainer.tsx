import { TerminalPresentation } from '@features/terminal/components/terminal'
import { type TerminalView, useTerminalView } from '@features/terminal/hooks/view'
import type { MachineLock } from '@shared/types'
import { useCallback, useEffect, useRef } from 'react'

export interface DevTerminalContainerProps {
  /** The router the prompt names. */
  router: string
  /** Shown over the console, to look at the lock plate. */
  lock: MachineLock | null
  /** Hands the terminal out once, so the workspace can type into it and focus it. */
  onReady: (view: TerminalView) => void
}

const ENTER = '\r'
const BACKSPACE = '\x7f'
const NOTE = '\x1b[2mThis dev route is not connected to the Machine: keys are echoed, nothing runs.\x1b[0m\r\n'

/** A terminal with nothing behind it, to look at the workspace: it echoes what is typed. */
export function DevTerminalContainer({ router, lock, onReady }: DevTerminalContainerProps) {
  const container = useRef<HTMLDivElement>(null)
  const view = useRef<TerminalView | null>(null)
  const prompt = `${router}:~# `

  const onInput = useCallback(
    (data: string) => {
      if (data === ENTER) {
        view.current?.write(`\r\n${prompt}`)
      } else if (data === BACKSPACE) {
        view.current?.write('\b \b')
      } else {
        view.current?.write(data)
      }
    },
    [prompt]
  )
  const terminal = useTerminalView(container, { onInput, onResize: () => {}, locked: lock !== null })
  view.current = terminal

  useEffect(() => {
    terminal.write(NOTE)
    onReady(terminal)
  }, [terminal, onReady])

  // A new line with the new router's prompt, as moving the shell between routers gives.
  useEffect(() => {
    terminal.write(`\r\n${prompt}`)
  }, [terminal, prompt])

  return <TerminalPresentation ref={container} lock={lock} />
}
