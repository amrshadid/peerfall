/** From least to most severe. */
export const LOG_LEVELS = ['debug', 'info', 'warn', 'error'] as const

export type LogLevel = (typeof LOG_LEVELS)[number]

/** The least severe level that is written; `silent` writes nothing. */
export type LogThreshold = LogLevel | 'silent'

/** Where log lines go: the browser console unless the app passes another to `configureCore()`. */
export type LogSink = Readonly<Record<LogLevel, (message: string, ...details: unknown[]) => void>>

// Tests stay quiet unless one opts in; a release keeps only what needs attention. Node scripts
// (the image build, the run recorder) have no import.meta.env.
export const DEFAULT_LOG_THRESHOLD: LogThreshold =
  import.meta.env?.MODE === 'test' ? 'silent' : import.meta.env?.DEV ? 'debug' : 'warn'
