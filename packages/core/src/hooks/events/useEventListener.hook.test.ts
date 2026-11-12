// @vitest-environment jsdom
import { cleanup, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useEventListener } from '#hooks/events/useEventListener.hook'
import { eventBus } from '#services/events/event-bus.service'

describe('useEventListener', () => {
  // No vitest globals, so React Testing Library cannot register its own cleanup.
  afterEach(() => cleanup())

  it('hears matching events while mounted, and stops on unmount', () => {
    const listener = vi.fn()
    const { unmount } = renderHook(() => useEventListener('HOOK_TEST_*', listener))

    eventBus.emit('HOOK_TEST_PING', 1)
    eventBus.emit('OTHER', 1)
    expect(listener).toHaveBeenCalledOnce()
    expect(listener).toHaveBeenCalledWith(expect.objectContaining({ type: 'HOOK_TEST_PING', payload: 1 }))

    unmount()
    eventBus.emit('HOOK_TEST_PING', 2)
    expect(listener).toHaveBeenCalledOnce()
    expect(eventBus.getListenerCount('HOOK_TEST_*')).toBe(0)
  })

  it('calls the latest listener without subscribing again', () => {
    const first = vi.fn()
    const second = vi.fn()
    const { rerender } = renderHook(({ listener }) => useEventListener('HOOK_TEST_LATEST', listener), {
      initialProps: { listener: first },
    })

    rerender({ listener: second })
    eventBus.emit('HOOK_TEST_LATEST', null)

    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledOnce()
    expect(eventBus.getListenerCount('HOOK_TEST_LATEST')).toBe(1)
  })
})
