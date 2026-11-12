import { describe, expect, it } from 'vitest'
import { matches } from './key-match.util'
import { SHORTCUTS } from './shortcut-table.constants'

describe('SHORTCUTS', () => {
  it('binds nothing macOS keeps for itself, so every game shortcut reaches the page', () => {
    // ⌘? (⌘⇧/) opens the Help menu; ⌘H hides, ⌘M minimizes, ⌘Q quits, ⌘W closes, ⌘` cycles windows.
    const reserved: readonly { code: string; mod: boolean; shift?: boolean }[] = [
      { code: 'Slash', mod: true, shift: true },
      ...['KeyH', 'KeyM', 'KeyQ', 'KeyW', 'Backquote'].map((code) => ({ code, mod: true })),
    ]
    const taken = SHORTCUTS.filter(
      (shortcut) =>
        shortcut.id !== null &&
        reserved.some((chord) =>
          matches(
            {
              code: chord.code,
              key: '',
              metaKey: chord.mod,
              ctrlKey: false,
              altKey: false,
              shiftKey: chord.shift ?? false,
            },
            shortcut.binding,
            true
          )
        )
    )
    expect(taken).toEqual([])
  })

  it('never binds a game shortcut the shell needs', () => {
    const shellKeys = ['KeyC', 'KeyD', 'KeyZ', 'KeyL', 'KeyR', 'Tab']
    const taken = SHORTCUTS.filter(
      (shortcut) => shortcut.group === 'Game' && shellKeys.includes(shortcut.binding.code) && !shortcut.binding.alt
    )
    expect(taken).toEqual([])
  })

  it('gives each game shortcut its own id', () => {
    const ids = SHORTCUTS.flatMap((shortcut) => (shortcut.id === null ? [] : [shortcut.id]))
    expect(new Set(ids).size).toBe(ids.length)
  })
})
