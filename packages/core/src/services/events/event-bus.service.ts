// Lets packages react to each other without importing each other.

import type {
  Event,
  EventBusConfig,
  EventListener,
  EventMiddleware,
  EventPattern,
  EventSubscription,
  IEventBus,
} from '#types/definitions/event'
import { logger } from '#utils/logging/logger.util'

const DEFAULT_MAX_HISTORY_SIZE = 100
const MATCH_ALL: EventPattern = '*'

const describeError = (error: unknown): { message: string; stack?: string | undefined } =>
  error instanceof Error ? { message: error.message, stack: error.stack } : { message: String(error) }

// Event names are plain identifiers today, but escaping keeps a `.` or `+` in a pattern literal.
const patternToRegExp = (pattern: EventPattern): RegExp => {
  const literal = pattern
    .split('*')
    .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
    .join('.*')
  return new RegExp(`^${literal}$`)
}

export class EventBus implements IEventBus {
  private listeners = new Map<EventPattern, Set<EventListener>>()
  private patterns = new Map<EventPattern, RegExp>()
  private middleware: EventMiddleware[] = []
  private history: Event[] = []
  private config: Required<EventBusConfig>
  private nextId = 0

  constructor(config: EventBusConfig = {}) {
    this.config = {
      maxHistorySize: config.maxHistorySize ?? DEFAULT_MAX_HISTORY_SIZE,
      enableHistory: config.enableHistory ?? true,
      warnOnNoListeners: config.warnOnNoListeners ?? false,
    }
  }

  emit<T>(type: string, payload: T, metadata: Partial<Event['metadata']> = {}): void {
    const event: Event<T> = {
      id: this.generateEventId(),
      type,
      payload,
      // Wall-clock time is fine here: the bus carries UI-level news, never the kernel's trace.
      metadata: { timestamp: Date.now(), ...metadata },
    }

    if (this.config.enableHistory) {
      this.addToHistory(event)
    }

    this.runMiddleware(event, () => {
      const matching = this.getMatchingListeners(type)
      if (matching.length === 0 && this.config.warnOnNoListeners) {
        logger.warn(`[EventBus] No listeners for event: ${type}`)
      }
      for (const listener of matching) {
        this.guard(`listener for ${type}`, () => listener(event))
      }
    })
  }

  on<T>(pattern: EventPattern, listener: EventListener<T>): EventSubscription {
    let listeners = this.listeners.get(pattern)
    if (!listeners) {
      listeners = new Set()
      this.listeners.set(pattern, listeners)
    }
    listeners.add(listener as EventListener)
    return { unsubscribe: () => this.off(pattern, listener) }
  }

  once<T>(pattern: EventPattern, listener: EventListener<T>): EventSubscription {
    const onceListener: EventListener<T> = (event) => {
      this.off(pattern, onceListener)
      return listener(event)
    }
    return this.on(pattern, onceListener)
  }

  off<T>(pattern: EventPattern, listener: EventListener<T>): void {
    const listeners = this.listeners.get(pattern)
    if (!listeners) {
      return
    }
    listeners.delete(listener as EventListener)
    if (listeners.size === 0) {
      this.listeners.delete(pattern)
    }
  }

  use(middleware: EventMiddleware): () => void {
    this.middleware.push(middleware)
    return () => {
      this.middleware = this.middleware.filter((used) => used !== middleware)
    }
  }

  getHistory(): Event[] {
    return [...this.history]
  }

  clearHistory(): void {
    this.history = []
  }

  /** Emits a past event again, marked `replayed` and keeping its original timestamp. */
  replay(eventId: string): void {
    const event = this.history.find((past) => past.id === eventId)
    if (event) {
      this.emit(event.type, event.payload, {
        ...event.metadata,
        replayed: true,
        originalTimestamp: event.metadata.timestamp,
      })
    }
  }

  /** Listeners on one pattern, or on all patterns when none is given. */
  getListenerCount(pattern?: EventPattern): number {
    if (pattern !== undefined) {
      return this.listeners.get(pattern)?.size ?? 0
    }
    let count = 0
    for (const listeners of this.listeners.values()) {
      count += listeners.size
    }
    return count
  }

  removeAllListeners(): void {
    this.listeners.clear()
  }

  // A counter, not Date.now() + Math.random(): ids stay unique and tests stay deterministic.
  private generateEventId(): string {
    this.nextId += 1
    return `event-${this.nextId}`
  }

  private addToHistory(event: Event): void {
    this.history.push(event)
    if (this.history.length > this.config.maxHistorySize) {
      this.history.shift()
    }
  }

  private report(what: string, error: unknown): void {
    const { message, stack } = describeError(error)
    logger.error(`[EventBus] Error in ${what}: ${message}`, stack)
  }

  // One failing listener must not stop the others, whether it throws or its promise rejects.
  private guard(what: string, run: () => void | Promise<void>): void {
    try {
      const result = run()
      if (result instanceof Promise) {
        result.catch((error: unknown) => this.report(what, error))
      }
    } catch (error) {
      this.report(what, error)
    }
  }

  private runMiddleware(event: Event, deliver: () => void): void {
    let index = 0
    const runNext = (): void => {
      const middleware = this.middleware[index++]
      if (!middleware) {
        deliver()
        return
      }
      let calledNext = false
      // Idempotent, so a middleware that calls next() and then throws doesn't deliver twice.
      const next = () => {
        if (!calledNext) {
          calledNext = true
          runNext()
        }
      }
      try {
        const result = middleware(event, next)
        if (result instanceof Promise) {
          result.catch((error: unknown) => this.report('middleware', error))
        }
      } catch (error) {
        this.report('middleware', error)
        // A broken middleware is skipped; it must not swallow the event.
        next()
      }
    }
    runNext()
  }

  private getMatchingListeners(type: string): EventListener[] {
    const matching: EventListener[] = []
    for (const [pattern, listeners] of this.listeners) {
      if (this.matches(type, pattern)) {
        matching.push(...listeners)
      }
    }
    return matching
  }

  private matches(type: string, pattern: EventPattern): boolean {
    if (pattern === type || pattern === MATCH_ALL) {
      return true
    }
    if (!pattern.includes('*')) {
      return false
    }
    let regex = this.patterns.get(pattern)
    if (!regex) {
      regex = patternToRegExp(pattern)
      this.patterns.set(pattern, regex)
    }
    return regex.test(type)
  }
}

/** The one bus the whole app shares. */
export const eventBus = new EventBus()
