import type { StampedMachineEvent } from '@peerfall/machine/types'
import { interfaceName } from '@peerfall/machine/utils'
import { ROUTE_STAMP_TOLERANCE_MS } from '#types/definitions/checks'
import type { RunContext } from '#types/definitions/mission'
import type { AdjacencyChange, GoodProbe, RouteUpdate, RunSummary } from '#types/definitions/runs'
import {
  detectionOf,
  outageOf,
  pathBeforeFault,
  type RunReading,
  readRun,
  repliesDuringFault,
} from '#utils/checks/index'
import { duringFault, type FaultWindow } from '#utils/events/index'

// ospfd's name for the state a working neighbor is in, as its AdjChg log line prints it.
const FULL = 'Full'

function adjacencyChangeOf(reading: RunReading, fault: FaultWindow, context: RunContext): AdjacencyChange | null {
  if (!context.fault) {
    return null
  }
  const [first, second] = context.fault.link
  const ends = new Set([`${first}/${interfaceName(first, second)}`, `${second}/${interfaceName(second, first)}`])
  for (const event of reading.events) {
    if (
      event.type === 'ospf_adjacency_change' &&
      event.from === FULL &&
      duringFault(fault, event.timeMs) &&
      ends.has(`${event.router}/${event.interface}`)
    ) {
      const { router, neighbor, from, to, reason, timeMs } = event
      return {
        router,
        neighbor,
        interface: event.interface,
        from,
        to,
        reason,
        atMs: timeMs,
        afterFaultMs: timeMs - fault.atMs,
      }
    }
  }
  return null
}

function routeUpdateOf(reading: RunReading, fault: FaultWindow): RouteUpdate | null {
  for (const change of reading.routes) {
    if (change.route && duringFault(fault, change.atMs)) {
      return { route: change.route, atMs: change.atMs, afterFaultMs: change.atMs - fault.atMs }
    }
  }
  return null
}

function firstGoodProbeOf(reading: RunReading, fault: FaultWindow, update: RouteUpdate | null): GoodProbe | null {
  if (!update) {
    return null
  }
  const reply = repliesDuringFault(reading).find((event) => event.timeMs + ROUTE_STAMP_TOLERANCE_MS >= update.atMs)
  return reply ? { sequence: reply.sequence, atMs: reply.timeMs, afterFaultMs: reply.timeMs - fault.atMs } : null
}

/** One run in the moments the timeline shows. Before the fault, only the healthy path and reply count are known. */
export function summariseRun(events: readonly StampedMachineEvent[], context: RunContext): RunSummary {
  const reading = readRun(events, context)
  const { fault, replies } = reading
  const pathBefore = pathBeforeFault(reading)
  if (!fault) {
    return {
      faultAtMs: null,
      pathBefore,
      detection: null,
      adjacencyChange: null,
      routeUpdate: null,
      firstGoodProbe: null,
      outage: null,
      repliesBeforeFault: replies.length,
      probesLost: 0,
    }
  }
  const routeUpdate = routeUpdateOf(reading, fault)
  return {
    faultAtMs: fault.atMs,
    pathBefore,
    detection: detectionOf(reading, context),
    adjacencyChange: adjacencyChangeOf(reading, fault, context),
    routeUpdate,
    firstGoodProbe: firstGoodProbeOf(reading, fault, routeUpdate),
    outage: outageOf(reading, context.probe?.id),
    repliesBeforeFault: replies.filter((reply) => reply.timeMs <= fault.atMs).length,
    probesLost: reading.events.filter(
      (event) => event.type === 'probe_lost' && event.probe === context.probe?.id && duringFault(fault, event.timeMs)
    ).length,
  }
}
