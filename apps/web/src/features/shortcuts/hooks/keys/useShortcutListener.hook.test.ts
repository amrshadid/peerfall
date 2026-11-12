// @vitest-environment jsdom
import { useAppStore } from '@app/store'
import { cleanup, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useShortcutListener } from './useShortcutListener.hook'

// jsdom's navigator is not a Mac, so the game's modifier is Ctrl here.
function press(init: KeyboardEventInit, target: EventTarget = window): KeyboardEvent {
  const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init })
  target.dispatchEvent(event)
  return event
}

afterEach(() => {
  cleanup()
  useAppStore.getState().closeCheatSheet()
  document.body.innerHTML = ''
})

describe('useShortcutListener', () => {
  it("runs the registered handler and keeps the browser's own action from running", () => {
    const hint = vi.fn()
    useAppStore.getState().registerShortcut('hint', hint)
    renderHook(() => useShortcutListener())
    const event = press({ code: 'KeyH', key: 'h', altKey: true })
    expect(hint).toHaveBeenCalledOnce()
    expect(event.defaultPrevented).toBe(true)
    useAppStore.getState().unregisterShortcut('hint', hint)
  })

  it("takes a game key even when no screen handles it, so Alt+E never opens the browser's menu", () => {
    renderHook(() => useShortcutListener())
    expect(press({ code: 'KeyE', key: 'e', altKey: true }).defaultPrevented).toBe(true)
  })

  it('opens the cheat sheet on ? outside text fields only', () => {
    renderHook(() => useShortcutListener())
    const input = document.body.appendChild(document.createElement('input'))
    press({ key: '?', shiftKey: true }, input)
    expect(useAppStore.getState().cheatSheetOpen).toBe(false)
    press({ key: '?', shiftKey: true })
    expect(useAppStore.getState().cheatSheetOpen).toBe(true)
  })

  it('leaves keys the game does not own alone', () => {
    renderHook(() => useShortcutListener())
    expect(press({ code: 'KeyC', key: 'c', ctrlKey: true }).defaultPrevented).toBe(false)
  })
})
