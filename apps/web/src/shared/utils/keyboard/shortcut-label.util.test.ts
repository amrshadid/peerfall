import { describe, expect, it } from 'vitest'
import { ariaKeyShortcut, shortcutKeys, shortcutLabel } from './shortcut-label.util'

const RUN = { code: 'Enter', mod: true }
const FORMAT = { code: 'KeyF', alt: true, shift: true }
const NEXT = { code: 'KeyN', alt: true }
const CHEAT_SHEET = { code: 'Slash', mod: true, shift: true }

describe('shortcutLabel on macOS', () => {
  it('prints symbols in Apple order, with no separator', () => {
    expect(shortcutLabel(RUN, true)).toBe('⌘⏎')
    expect(shortcutLabel(FORMAT, true)).toBe('⌥⇧F')
    expect(shortcutLabel(NEXT, true)).toBe('⌥N')
    expect(shortcutKeys(CHEAT_SHEET, true)).toEqual(['⇧', '⌘', '/'])
  })
})

describe('shortcutLabel on Windows and Linux', () => {
  it('prints names joined with +, Ctrl then Alt then Shift', () => {
    expect(shortcutLabel(RUN, false)).toBe('Ctrl+Enter')
    expect(shortcutLabel(FORMAT, false)).toBe('Alt+Shift+F')
    expect(shortcutLabel(NEXT, false)).toBe('Alt+N')
    expect(shortcutKeys(CHEAT_SHEET, false)).toEqual(['Ctrl', 'Shift', '/'])
  })
})

describe('ariaKeyShortcut', () => {
  it("uses ARIA's names: Meta on macOS, Control elsewhere", () => {
    expect(ariaKeyShortcut(RUN, true)).toBe('Meta+Enter')
    expect(ariaKeyShortcut(RUN, false)).toBe('Control+Enter')
    expect(ariaKeyShortcut(NEXT, true)).toBe('Alt+N')
    expect(ariaKeyShortcut(FORMAT, false)).toBe('Alt+Shift+F')
  })
})
