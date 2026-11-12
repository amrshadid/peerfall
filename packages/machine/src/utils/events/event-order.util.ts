import type { StampedMachineEvent } from '#types/definitions/event'
import type { VmEventUpdate } from '#types/definitions/vm'

/** The stream as it arrived, and the same events in the order they happened. */
export interface EventLog {
  /** By `seq`: what an update's `from` counts in. */
  readonly received: readonly StampedMachineEvent[]
  /** By the Machine's clock, then `seq`. */
  readonly events: readonly StampedMachineEvent[]
}

export const EMPTY_EVENT_LOG: EventLog = { received: [], events: [] }

const happenedBefore = (first: StampedMachineEvent, second: StampedMachineEvent): boolean =>
  first.timeMs < second.timeMs || (first.timeMs === second.timeMs && first.seq < second.seq)

/**
 * Applies an update to the log. A log line arrives up to a second after it was written, while a
 * route or a probe arrives at once, so each new event is moved back to where it happened; almost
 * all are already last. An update that starts before the log's end replaces everything after it:
 * the Machine went back to that moment.
 */
export function applyEventUpdate(log: EventLog, { from, events }: VmEventUpdate): EventLog {
  const rewound = from < log.received.length
  if (!rewound && events.length === 0) {
    return log
  }
  const received = rewound ? log.received.slice(0, from) : [...log.received]
  const ordered = rewound ? log.events.filter((event) => event.seq < from) : [...log.events]
  for (const event of events) {
    received.push(event)
    let at = ordered.length
    while (at > 0 && happenedBefore(event, ordered[at - 1] as StampedMachineEvent)) {
      at--
    }
    ordered.splice(at, 0, event)
  }
  return { received, events: ordered }
}
