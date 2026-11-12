import type { KeyPress, Shortcut, ShortcutId } from '@shared/types'
import { SHORTCUTS, shortcutKeys, shortcutLabel, TERMINAL_MODIFIER } from '@shared/utils/keyboard'

// Elements a bare `?` types into.
const TEXT_FIELD_TAGS: readonly string[] = ['INPUT', 'TEXTAREA', 'SELECT']

export function isQuestionMark(press: KeyPress): boolean {
  return press.key === '?' && !press.altKey && !press.ctrlKey && !press.metaKey
}

/** Key labels as printed on the cheat sheet, e.g. `["⇧", "⌘", "/"]` or `["Alt", "H"]`. */
export function keysOf(shortcut: Shortcut, isMac: boolean): readonly string[] {
  const { binding } = shortcut
  if (shortcut.group === 'Terminal') {
    // The shell's keys are Ctrl on every system, as in a real terminal.
    const key = shortcutKeys({ code: binding.code }, false)
    return binding.code.startsWith('Arrow') ? key : [TERMINAL_MODIFIER, ...key]
  }
  return shortcutKeys(binding, isMac)
}

export function shortcutLabelOf(id: ShortcutId, isMac?: boolean): string {
  const shortcut = SHORTCUTS.find((candidate) => candidate.id === id)
  return shortcut ? shortcutLabel(shortcut.binding, isMac) : ''
}

/** Typing targets where a bare `?` must type a question mark, not open a sheet. */
export function isTextField(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false
  }
  return target.isContentEditable || TEXT_FIELD_TAGS.includes(target.tagName)
}
