import { openTerminal } from '@features/terminal/utils/xterm'
import type { Terminal } from '@xterm/xterm'
import { type RefObject, useCallback, useEffect, useMemo, useRef } from 'react'
import '@xterm/xterm/css/xterm.css'

export interface TerminalViewOptions {
  /** Every key the player types, escape sequences and all, as the tty expects them. */
  readonly onInput: (data: string) => void
  /** The size it opened at and each new one, so the guest's tty can follow. */
  readonly onResize: (rows: number, cols: number) => void
  /** Keys are dropped while true: a shell that is about to be replaced must not receive them. */
  readonly locked?: boolean
}

export interface TerminalView {
  /** Shows console bytes or text. What arrives before the terminal has opened is kept and shown first. */
  readonly write: (data: Uint8Array | string) => void
  readonly focus: () => void
  /** Empties the screen and its scrollback, for a shell that replaces the one shown. */
  readonly clear: () => void
}

/** An xterm.js terminal in `container`. It knows nothing of the Machine: keys go out, bytes come in. */
export function useTerminalView(
  container: RefObject<HTMLDivElement | null>,
  { onInput, onResize, locked = false }: TerminalViewOptions
): TerminalView {
  const terminal = useRef<Terminal | null>(null)
  const early = useRef<(Uint8Array | string)[]>([])
  // Read when a key or a resize happens, so new callbacks never reopen the terminal and lose its scrollback.
  const latest = useRef({ onInput, onResize, locked })
  latest.current = { onInput, onResize, locked }

  const write = useCallback((data: Uint8Array | string) => {
    if (terminal.current) {
      terminal.current.write(data)
    } else {
      early.current.push(data)
    }
  }, [])

  const focus = useCallback(() => terminal.current?.focus(), [])

  // reset, not clear: xterm's clear keeps the prompt's line, the very line that is stale.
  const clear = useCallback(() => {
    early.current = []
    terminal.current?.reset()
  }, [])

  useEffect(() => {
    if (terminal.current) {
      terminal.current.options.disableStdin = locked
    }
  }, [locked])

  useEffect(() => {
    const element = container.current
    if (!element) {
      return
    }
    // The guest's tty adds the carriage returns itself.
    const opened = openTerminal(element, { convertEol: false })
    for (const data of early.current) {
      opened.terminal.write(data)
    }
    early.current = []
    opened.terminal.options.disableStdin = latest.current.locked
    const typing = opened.terminal.onData((data) => {
      if (!latest.current.locked) {
        latest.current.onInput(data)
      }
    })
    const sizing = opened.terminal.onResize(({ rows, cols }) => latest.current.onResize(rows, cols))
    latest.current.onResize(opened.terminal.rows, opened.terminal.cols)
    terminal.current = opened.terminal
    return () => {
      typing.dispose()
      sizing.dispose()
      terminal.current = null
      opened.dispose()
    }
  }, [container])

  return useMemo(() => ({ write, focus, clear }), [write, focus, clear])
}
