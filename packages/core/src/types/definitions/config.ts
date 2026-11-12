import type { LoggingConfig } from '#types/definitions/event'
import type { LogSink, LogThreshold } from '#types/definitions/logger'
import { DEFAULT_LOG_THRESHOLD } from '#types/definitions/logger'

/** Options the app can set once at startup with `configureCore()`. */
export interface CoreConfig {
  /** Logs every event on the bus at `debug`, for following the app's event flow while debugging. */
  readonly logEvents: false | LoggingConfig
  /** Silent in tests, `debug` in development, `warn` in a release. */
  readonly logLevel: LogThreshold
  /** Undefined: the browser console. */
  readonly logSink: LogSink | undefined
}

export const DEFAULT_CORE_CONFIG: CoreConfig = { logEvents: false, logLevel: DEFAULT_LOG_THRESHOLD, logSink: undefined }
