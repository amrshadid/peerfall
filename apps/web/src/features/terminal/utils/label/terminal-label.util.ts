export interface TerminalLabelInput {
  /** The router the terminal is in; null for the Machine's own shell. */
  readonly router: string | null
  /** The router the mission puts the terminal in once its network is built; null for none. */
  readonly firstRouter: string | null
  /** The network is built (or settling), so the terminal is being moved into `firstRouter`. */
  readonly routersBuilt: boolean
}

/**
 * What the terminal's header names. Between the network being built and the shell arriving in the
 * mission's first router (a second or more), it says where the terminal is going, not "select a
 * router": nothing is asked of the player there.
 */
export function terminalLabelOf({ router, firstRouter, routersBuilt }: TerminalLabelInput): string {
  if (router !== null) {
    return `router ${router}`
  }
  if (routersBuilt && firstRouter !== null) {
    return `going into router ${firstRouter}…`
  }
  return 'the Machine: select a router on the map'
}
