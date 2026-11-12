import { useEffect, useEffectEvent } from 'react'
import { eventBus } from '#services/events/event-bus.service'
import type { EventListener, EventPattern } from '#types/definitions/event'

/**
 * Calls `listener` for every event matching `pattern` while the component is
 * mounted. It always calls the latest `listener`, so callers can pass an inline
 * function without resubscribing on every render.
 */
export function useEventListener<T>(pattern: EventPattern, listener: EventListener<T>): void {
  const onEvent = useEffectEvent(listener)

  useEffect(() => {
    const subscription = eventBus.on<T>(pattern, (event) => onEvent(event))
    return () => subscription.unsubscribe()
  }, [pattern])
}
