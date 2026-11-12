// @vitest-environment jsdom
import type { KeyPress, Shortcut } from '@shared/types'
import { SHORTCUTS } from '@shared/utils/keyboard'
import { describe, expect, it } from 'vitest'
import { isQuestionMark, isTextField, keysOf, shortcutLabelOf } from './shortcut.util'

const press = (overrides: Partial<KeyPress>): KeyPress => ({
  code: 'KeyS',
  key: 's',
  metaKey: false,
  ctrlKey: false,
  altKey: false,
  shiftKey: false,
  ...overrides,
})

const byId = (id: string): Shortcut => {
  const found = SHORTCUTS.find((shortcut) => shortcut.id === id)
  if (!found) {
    throw new Error(id)
  }
  return found
}

describe('isQuestionMark', () => {
  it('is the plain ? key only', () => {
    expect(isQuestionMark(press({ key: '?', shiftKey: true }))).toBe(true)
    expect(isQuestionMark(press({ key: '?', metaKey: true }))).toBe(false)
  })
})

describe('keysOf', () => {
  it('prints platform keys for game shortcuts and Ctrl for the terminal', () => {
    // Apple's order: Option, Shift, Command, then the key.
    expect(keysOf(byId('next-step'), true)).toEqual(['⌥', 'N'])
    expect(keysOf(byId('cheat-sheet'), true)).toEqual(['⌥', '/'])
    expect(keysOf(byId('hint'), false)).toEqual(['Alt', 'H'])
    const sigint = SHORTCUTS.find((shortcut) => shortcut.binding.code === 'KeyC')
    expect(sigint && keysOf(sigint, true)).toEqual(['Ctrl', 'C'])
  })
})

describe('shortcutLabelOf', () => {
  it('names a game shortcut by id', () => {
    expect(shortcutLabelOf('hint', true)).toBe('⌥H')
    expect(shortcutLabelOf('focus-editor', false)).toBe('Alt+E')
  })
})

describe('isTextField', () => {
  it('is true where a bare ? types a character', () => {
    expect(isTextField(document.createElement('input'))).toBe(true)
    expect(isTextField(document.createElement('textarea'))).toBe(true)
    const editable = document.createElement('div')
    editable.contentEditable = 'true'
    // jsdom has no layout engine and never derives isContentEditable from the attribute.
    Object.defineProperty(editable, 'isContentEditable', { value: true })
    expect(isTextField(editable)).toBe(true)
  })

  it('is false for anything else', () => {
    expect(isTextField(document.createElement('button'))).toBe(false)
    expect(isTextField(null)).toBe(false)
    expect(isTextField(window)).toBe(false)
  })
})
