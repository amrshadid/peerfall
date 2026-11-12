import type { StampedMachineEvent } from '@peerfall/machine/types'
import type { RunContext } from '#types/definitions/mission'
import {
  duringFault,
  type FaultWindow,
  faultWindow,
  inTimeOrder,
  type ProbeReply,
  probeReplies,
} from '#utils/events/index'
import { type RouteChange, routeChanges } from '#utils/routes/index'

/** A run's events, read once for what every check asks about. */
export interface RunReading {
  /** In time order. */
  readonly events: readonly StampedMachineEvent[]
  readonly fault: FaultWindow | null
  /** The mission's probe's replies, in the order they arrived. */
  readonly replies: readonly ProbeReply[]
  /** How the probe's router forwarded to the probe's destination, over the run. */
  readonly routes: readonly RouteChange[]
}

export function readRun(events: readonly StampedMachineEvent[], context: RunContext): RunReading {
  const ordered = inTimeOrder(events)
  return {
    events: ordered,
    fault: faultWindow(ordered, context.fault),
    replies: probeReplies(ordered, context.probe.id),
    routes: routeChanges(ordered, context.probe.from, context.probe.destination),
  }
}

/** Replies that arrived while the link was dropping packets. */
export function repliesDuringFault(reading: RunReading): readonly ProbeReply[] {
  const { fault } = reading
  return fault ? reading.replies.filter((reply) => duringFault(fault, reply.timeMs)) : []
}
