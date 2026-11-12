// @vitest-environment jsdom
import type { ITheme, Terminal } from '@xterm/xterm'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { followTheme, terminalTheme } from './terminal-theme.util'

describe('terminalTheme', () => {
  it('reads the colours from the design tokens', () => {
    const tokens: Record<string, string> = { '--ink': ' #000000 ', '--soft': '#ffffff', '--red': '#ff0000' }
    const theme = terminalTheme((name) => tokens[name] ?? '')
    expect(theme).toMatchObject({ foreground: '#000000', background: '#ffffff', red: '#ff0000', cursor: '#000000' })
  })

  it('falls back to Day print where the page has no token', () => {
    expect(terminalTheme(() => '')).toMatchObject({ foreground: '#141414', background: '#e5e5df' })
  })
})

describe('followTheme', () => {
  const listeners = new Set<() => void>()

  afterEach(() => {
    vi.unstubAllGlobals()
    listeners.clear()
    document.documentElement.removeAttribute('data-theme')
  })

  function stubScheme() {
    vi.stubGlobal('matchMedia', () => ({
      addEventListener: (_: string, listener: () => void) => listeners.add(listener),
      removeEventListener: (_: string, listener: () => void) => listeners.delete(listener),
    }))
  }

  function followed() {
    const element = document.createElement('div')
    element.style.setProperty('--ink', '#111111')
    document.body.append(element)
    const terminal = { options: {} as { theme?: ITheme } }
    const stop = followTheme(terminal as unknown as Pick<Terminal, 'options'>, element)
    return { element, terminal, stop }
  }

  it('themes the terminal at once', () => {
    stubScheme()
    const { terminal } = followed()
    expect(terminal.options.theme?.foreground).toBe('#111111')
  })

  it('re-themes when the system scheme changes, until stopped', () => {
    stubScheme()
    const { element, terminal, stop } = followed()
    element.style.setProperty('--ink', '#222222')
    for (const listener of listeners) listener()
    expect(terminal.options.theme?.foreground).toBe('#222222')
    stop()
    expect(listeners.size).toBe(0)
  })

  it("re-themes when the player's theme setting changes", async () => {
    stubScheme()
    const { element, terminal } = followed()
    element.style.setProperty('--ink', '#333333')
    document.documentElement.setAttribute('data-theme', 'dark')
    await Promise.resolve()
    expect(terminal.options.theme?.foreground).toBe('#333333')
  })
})
