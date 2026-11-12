import { eventBus } from '#services/events/event-bus.service'
import { createLoggingMiddleware } from '#services/events/event-logging.service'
import { type CoreConfig, DEFAULT_CORE_CONFIG } from '#types/definitions/config'
import { setLogOutput } from '#utils/logging/logger.util'

let _config: CoreConfig = DEFAULT_CORE_CONFIG
let removeLogging: (() => void) | null = null

/** Once at app startup. Options left out keep their defaults. */
export function configureCore(config: Partial<CoreConfig> = {}) {
  _config = { ...DEFAULT_CORE_CONFIG, ...config }
  setLogOutput({ sink: _config.logSink, threshold: _config.logLevel })
  removeLogging?.()
  removeLogging =
    _config.logEvents === false ? null : eventBus.use(createLoggingMiddleware({ enabled: true, ..._config.logEvents }))
}

export function getCoreConfig(): CoreConfig {
  return _config
}

export function resetCoreConfig() {
  configureCore()
}
