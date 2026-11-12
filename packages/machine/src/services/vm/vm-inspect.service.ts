import type { Validated } from '@peerfall/core/types'
import { ROUTER_NAME } from '#types/definitions/network'
import type { MachineState, PingResult, RouterState, StateRequest } from '#types/definitions/state'
import { type ControlReply, VM_SETUP_TIMEOUT_MS } from '#types/definitions/vm'
import { frrRestartLine } from '#utils/network/network-script.util'
import {
  parsePing,
  parseRouterState,
  pingLine,
  routerStateLine,
  stateRequestProblems,
} from '#utils/state/machine-state.util'

type Control = (line: string, timeoutMs?: number) => Promise<ControlReply>

/**
 * Reads the Machine as it is now: the asked parts of each router, then the pings, one control
 * line each. Fails with every problem in the request, or when the Machine stops answering.
 */
export async function readMachineState(control: Control, request: StateRequest): Promise<Validated<MachineState>> {
  const problems = stateRequestProblems(request)
  if (problems.length > 0) {
    return { ok: false, errors: problems }
  }
  const routers: Record<string, RouterState> = {}
  for (const [router, parts] of Object.entries(request.routers)) {
    if (parts.length === 0) {
      routers[router] = {}
      continue
    }
    const reply = await control(routerStateLine(router, parts))
    if (reply.status !== 0) {
      return { ok: false, errors: [`Router ${router} could not be read`] }
    }
    routers[router] = parseRouterState(reply.output)
  }
  const pings: PingResult[] = []
  for (const ping of request.pings) {
    const reply = await control(pingLine(ping))
    if (reply.status !== 0) {
      return { ok: false, errors: [`The ping from ${ping.from} to ${ping.to} could not be sent`] }
    }
    pings.push(parsePing(ping, reply.output))
  }
  return { ok: true, value: { routers, pings } }
}

/**
 * Restarts a router's FRR with FRR's own init script: every daemon stops, and starts again from
 * the saved frr.conf. What was configured and not saved is gone, as after a power cut. Only for a
 * router whose `startup` is `watchfrr` or `none`: the script needs its `daemons` file.
 */
export async function restartRouterFrr(control: Control, router: string): Promise<Validated<null>> {
  if (!ROUTER_NAME.test(router)) {
    return { ok: false, errors: [`Expected a router's name, got "${router}"`] }
  }
  const reply = await control(frrRestartLine(router), VM_SETUP_TIMEOUT_MS)
  return reply.status === 0
    ? { ok: true, value: null }
    : { ok: false, errors: [`FRR could not be restarted on ${router}`, reply.output.trim()].filter(Boolean) }
}
