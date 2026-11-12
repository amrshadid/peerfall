import type { Validated } from '@peerfall/core/types'
import type { ControlReply } from '#types/definitions/vm'
import {
  configApplyLine,
  configChanges,
  configErrors,
  configReadLine,
  runningConfigText,
} from '#utils/config/config-diff.util'

type Control = (line: string) => Promise<ControlReply>

/**
 * FRR often takes a line away with fewer words than it was entered with: `description to a` goes
 * with `no description`. The next shorter form to try, or null when there is none.
 */
export function shorterNegation(command: string): string | null {
  const words = command.split(' ')
  return words[0] === 'no' && words.length > 2 ? words.slice(0, -1).join(' ') : null
}

/** Types one group of commands into the router; a refused negation is tried again, shorter, until FRR takes it. */
async function applyGroup(control: Control, router: string, group: readonly string[]): Promise<string[]> {
  let commands = [...group]
  for (;;) {
    const errors = configErrors((await control(configApplyLine(router, [commands]))).output)
    if (errors.length === 0) {
      return []
    }
    const at = commands.findIndex((command) => shorterNegation(command) !== null)
    if (at === -1) {
      return errors
    }
    // Only negations get shorter; what FRR already took in this group is taken again unchanged.
    commands = commands.map((command, index) => (index === at ? (shorterNegation(command) ?? command) : command))
  }
}

/** A router's running configuration as text; null when the router does not answer. */
export async function readRouterConfig(control: Control, router: string): Promise<string | null> {
  const reply = await control(configReadLine(router))
  return reply.status === 0 ? runningConfigText(reply.output) : null
}

/**
 * Makes a router's configuration the edited text: only what differs from its running
 * configuration is typed into its vtysh, as frr-reload does on a real router. Fails with FRR's
 * own messages for the lines it refused; the lines it accepted stay applied.
 */
export async function applyRouterConfig(control: Control, router: string, config: string): Promise<Validated<null>> {
  const current = await readRouterConfig(control, router)
  if (current === null) {
    return { ok: false, errors: [`Router ${router} did not answer`] }
  }
  const errors: string[] = []
  for (const group of configChanges(current, config)) {
    errors.push(...(await applyGroup(control, router, group)))
  }
  return errors.length === 0 ? { ok: true, value: null } : { ok: false, errors: [...new Set(errors)] }
}
