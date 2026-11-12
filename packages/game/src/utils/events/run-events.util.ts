import type { MachineEventType, StampedMachineEvent } from '@peerfall/machine/types'
import type { FaultDefinition } from '#types/definitions/mission'

export type EventOf<Type extends MachineEventType> = Extract<StampedMachineEvent, { readonly type: Type }>

export type ProbeReply = EventOf<'probe_received'>

/**
 * By the Machine's clock, then by stream position. Events reach the stream from several sources
 * (FRR's logs, the kernel's route notifications, the probe's output), so the stream's own order
 * can differ from the order things happened in.
 */
export function inTimeOrder(events: readonly StampedMachineEvent[]): StampedMachineEvent[] {
  return [...events].sort((first, second) => first.timeMs - second.timeMs || first.seq - second.seq)
}

export function eventsOf<Type extends MachineEventType>(
  events: readonly StampedMachineEvent[],
  type: Type
): EventOf<Type>[] {
  return events.filter((event): event is EventOf<Type> => event.type === type)
}

const sameLink = (first: readonly [string, string], second: readonly [string, string]): boolean =>
  (first[0] === second[0] && first[1] === second[1]) || (first[0] === second[1] && first[1] === second[0])

/** When a run's fault held: everything a check says about "after the fault" is read from this window. */
export interface FaultWindow {
  readonly atMs: number
  /** `null` while the link is still dropping packets. */
  readonly clearedAtMs: number | null
}

/** The first time the mission's link was faulted in this run, or `null` if it hasn't been yet. */
export function faultWindow(events: readonly StampedMachineEvent[], fault: FaultDefinition): FaultWindow | null {
  const ordered = inTimeOrder(events)
  const injected = ordered.find((event) => event.type === 'fault_injected' && sameLink(event.link, fault.link))
  if (!injected) {
    return null
  }
  const cleared = ordered.find(
    (event) => event.type === 'fault_cleared' && sameLink(event.link, fault.link) && event.timeMs >= injected.timeMs
  )
  return { atMs: injected.timeMs, clearedAtMs: cleared?.timeMs ?? null }
}

/** Whether `timeMs` falls after the fault began and before it was cleared. */
export const duringFault = (window: FaultWindow, timeMs: number): boolean =>
  timeMs > window.atMs && (window.clearedAtMs === null || timeMs <= window.clearedAtMs)

/** One probe's replies, in the order they arrived. */
export function probeReplies(events: readonly StampedMachineEvent[], probeId: string): ProbeReply[] {
  return eventsOf(inTimeOrder(events), 'probe_received').filter((event) => event.probe === probeId)
}
