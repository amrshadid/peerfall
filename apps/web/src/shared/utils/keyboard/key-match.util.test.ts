import type { KeyPress } from '@shared/types/definitions/keys'
import { describe, expect, it } from 'vitest'
import { matches } from './key-match.util'

const press = (overrides: Partial<KeyPress>): KeyPress => ({
  code: 'KeyS',
  key: 's',
  metaKey: false,
  ctrlKey: false,
  altKey: false,
  shiftKey: false,
  ...overrides,
})

const SAVE = { code: 'KeyS', mod: true }
const HINT = { code: 'KeyH', alt: true }
const CHEAT_SHEET = { code: 'Slash', alt: true }

describe('matches', () => {
  it('uses Cmd on macOS and Ctrl elsewhere for Mod', () => {
    expect(matches(press({ metaKey: true }), SAVE, true)).toBe(true)
    expect(matches(press({ ctrlKey: true }), SAVE, false)).toBe(true)
    expect(matches(press({ ctrlKey: true }), SAVE, true)).toBe(false)
  })

  it('matches Alt combos by code, whatever character Option typed', () => {
    expect(matches(press({ code: 'KeyH', key: '˙', altKey: true }), HINT, true)).toBe(true)
    expect(matches(press({ code: 'Slash', key: '÷', altKey: true }), CHEAT_SHEET, true)).toBe(true)
    expect(matches(press({ code: 'Slash', key: '/', altKey: true }), CHEAT_SHEET, false)).toBe(true)
  })

  it('rejects extra modifiers', () => {
    expect(matches(press({ code: 'KeyH', altKey: true, shiftKey: true }), HINT, false)).toBe(false)
  })
})
