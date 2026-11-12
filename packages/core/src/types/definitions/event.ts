export interface Event<T = unknown> {
  /** Unique within the bus that emitted it. */
  id: string
  /** The package's event name, e.g. `GAME_LEVEL_STARTED`. */
  type: string
  payload: T
  metadata: {
    /** Wall-clock milliseconds when emitted. */
    timestamp: number
    /** Which package and domain emitted it, e.g. `game/level`. */
    source?: string
    [key: string]: unknown
  }
}

export type EventListener<T = unknown> = (event: Event<T>) => void | Promise<void>

/** Runs before the listeners; it may log, change or stop the event (by not calling `next`). */
export type EventMiddleware = (event: Event, next: () => void) => void | Promise<void>

export interface LoggingConfig {
  /** Off by default, so the shared instance costs nothing until a developer turns it on. */
  enabled?: boolean
  /** Log the whole event, not just its payload and metadata. */
  verbose?: boolean
  /** Which events to log: a regex on the type, or a predicate. */
  filter?: RegExp | ((event: Event) => boolean)
}

export interface EventSubscription {
  unsubscribe: () => void
}

/**
 * An event name, or a pattern where `*` stands for any text:
 * `GAME_*` matches every game event, `*_FINISHED` every finished one, `*` all of them.
 */
export type EventPattern = string

export interface EventBusConfig {
  /** How many past events `getHistory()` and `replay()` can reach. */
  maxHistorySize?: number
  enableHistory?: boolean
  /** Warn when an event reaches no listener: handy to catch a misspelt name. */
  warnOnNoListeners?: boolean
}

export interface IEventBus {
  emit<T>(type: string, payload: T, metadata?: Partial<Event['metadata']>): void
  on<T>(pattern: EventPattern, listener: EventListener<T>): EventSubscription
  once<T>(pattern: EventPattern, listener: EventListener<T>): EventSubscription
  off<T>(pattern: EventPattern, listener: EventListener<T>): void
  /** Returns a function that removes the middleware again. */
  use(middleware: EventMiddleware): () => void
  getHistory(): Event[]
  clearHistory(): void
  replay(eventId: string): void
  getListenerCount(pattern?: EventPattern): number
}
