import { useMemo } from 'react'
import { sendToVm } from '#services/vm/vm-connection.service'

export interface UseTerminalCommandResult {
  /** Types a command line into the terminal and presses Enter, as the player would. */
  readonly run: (commandLine: string) => void
}

/** Runs a command line in the terminal, in bash or in vtysh, whichever it is at: for the Guide's command chips. */
export function useTerminalCommand(): UseTerminalCommandResult {
  // `\r` is the key a terminal sends for Enter, so the line finishes as a typed one does.
  return useMemo(() => ({ run: (commandLine: string) => sendToVm(`${commandLine}\r`) }), [])
}
