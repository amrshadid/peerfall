// @vitest-environment jsdom
import type { Route } from '@shared/types/definitions/route'
import { cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useRouteFocus } from './useRouteFocus.hook'

function heading(): HTMLElement {
  const h1 = document.body.appendChild(document.createElement('h1'))
  h1.tabIndex = -1
  return h1
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame'] })
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  document.body.replaceChildren()
})

describe('useRouteFocus', () => {
  it("focuses the new screen's heading once its lazy chunk renders it", () => {
    renderHook(() => useRouteFocus({ name: 'settings', section: null }, true))
    const h1 = heading()
    vi.advanceTimersToNextFrame()
    expect(document.activeElement).toBe(h1)
  })

  it('leaves focus alone while the screen stays the same', () => {
    const h1 = heading()
    const { rerender } = renderHook(({ route }) => useRouteFocus(route, true), {
      initialProps: { route: { name: 'mission', missionId: 'a' } as Route },
    })
    expect(document.activeElement).toBe(h1)
    const button = document.body.appendChild(document.createElement('button'))
    button.focus()
    rerender({ route: { name: 'mission', missionId: 'a' } })
    expect(document.activeElement).toBe(button)
  })

  it('moves focus again when the window crosses the play width', () => {
    const h1 = heading()
    const { rerender } = renderHook(({ wide }) => useRouteFocus({ name: 'title' }, wide), {
      initialProps: { wide: true },
    })
    const button = document.body.appendChild(document.createElement('button'))
    button.focus()
    rerender({ wide: false })
    expect(document.activeElement).toBe(h1)
  })
})
