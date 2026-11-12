import type { Event, EventMiddleware, LoggingConfig } from '#types/definitions/event'
import { logger } from '#utils/logging/logger.util'

// The console keeps a live reference, and an object expanded later shows its
// state then, not when it was emitted; a clone shows the event as it was.
function snapshot(value: unknown): unknown {
  try {
    return structuredClone(value)
  } catch {
    return value
  }
}

const shouldLog = (event: Event, filter: LoggingConfig['filter']): boolean => {
  if (!filter) {
    return true
  }
  return typeof filter === 'function' ? filter(event) : filter.test(event.type)
}

const detailsOf = (event: Event, verbose: boolean): Record<string, unknown> => {
  if (verbose) {
    return { event: snapshot(event) }
  }
  const { timestamp: _, ...rest } = event.metadata
  return Object.keys(rest).length > 0
    ? { payload: snapshot(event.payload), metadata: snapshot(rest) }
    : { payload: snapshot(event.payload) }
}

/** Logs each event at `debug`, for following the app's event flow. */
export function createLoggingMiddleware(config: LoggingConfig = {}): EventMiddleware {
  const { enabled = false, verbose = false, filter } = config

  return (event, next) => {
    if (enabled && shouldLog(event, filter)) {
      const time = new Date(event.metadata.timestamp).toLocaleTimeString()
      logger.debug(`[Event] ${event.type} @ ${time}`, detailsOf(event, verbose))
    }
    next()
  }
}
