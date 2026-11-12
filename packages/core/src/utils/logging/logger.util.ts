import type { LogLevel, LogSink, LogThreshold } from '#types/definitions/logger'
import { DEFAULT_LOG_THRESHOLD, LOG_LEVELS } from '#types/definitions/logger'

// The only place that touches the console. debug goes to console.log because
// browsers hide console.debug by default, and a developer who turns on the
// event log expects to see it.
const CONSOLE_SINK: LogSink = {
  debug: (message, ...details) => console.log(message, ...details),
  info: (message, ...details) => console.info(message, ...details),
  warn: (message, ...details) => console.warn(message, ...details),
  error: (message, ...details) => console.error(message, ...details),
}

let sink: LogSink = CONSOLE_SINK
let threshold: LogThreshold = DEFAULT_LOG_THRESHOLD

/** Called by `configureCore()`; a missing sink means the console. */
export function setLogOutput(output: { readonly sink?: LogSink | undefined; readonly threshold: LogThreshold }): void {
  sink = output.sink ?? CONSOLE_SINK
  threshold = output.threshold
}

const writes = (level: LogLevel): boolean =>
  threshold !== 'silent' && LOG_LEVELS.indexOf(level) >= LOG_LEVELS.indexOf(threshold)

const writer =
  (level: LogLevel) =>
  (message: string, ...details: unknown[]): void => {
    if (writes(level)) {
      sink[level](message, ...details)
    }
  }

/** The app's one logger: every package logs through it, never through `console`. */
export const logger: LogSink = {
  debug: writer('debug'),
  info: writer('info'),
  warn: writer('warn'),
  error: writer('error'),
}
