// @vitest-environment jsdom
import { useAppStore } from '@app/store'
import { cleanup, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useShortcut } from './useShortcut.hook'

const handlerOf = (id: 'hint' | 'next-step') => useAppStore.getState().shortcutHandlers[id]

afterEach(() => {
  cleanup()
})

describe('useShortcut', () => {
  it('handles the key while mounted, always with the latest handler', () => {
    const first = vi.fn()
    const second = vi.fn()
    const { rerender, unmount } = renderHook(({ handler }) => useShortcut('hint', handler), {
      initialProps: { handler: first },
    })
    rerender({ handler: second })
    handlerOf('hint')?.()
    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledOnce()

    unmount()
    expect(handlerOf('hint')).toBeUndefined()
  })

  it('leaves the key alone while disabled', () => {
    renderHook(() => useShortcut('next-step', vi.fn(), false))
    expect(handlerOf('next-step')).toBeUndefined()
  })
})
