import { vi } from 'vitest'
import { configureCore } from '#config'
import type { LogSink, LogThreshold } from '#types/definitions/logger'

type RecordingSink = { readonly [Level in keyof LogSink]: ReturnType<typeof vi.fn<LogSink[Level]>> }

/** Sends the logger to mocks from `level` up, so a test can read what was logged. Undo with `resetCoreConfig()`. */
export function recordLogs(level: LogThreshold = 'debug'): RecordingSink {
  const sink = { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() }
  configureCore({ logLevel: level, logSink: sink })
  return sink
}
