import type { KeyBinding } from '@shared/types/definitions/keys'
import { isMacPlatform } from './platform.util'

const MAC_KEYS: Readonly<Record<string, string>> = { Enter: '⏎', Slash: '/', ArrowUp: '↑' }
const OTHER_KEYS: Readonly<Record<string, string>> = { Slash: '/', ArrowUp: '↑' }
// ARIA names keys by KeyboardEvent.key.
const ARIA_KEYS: Readonly<Record<string, string>> = { Slash: '/' }

const bareKey = (code: string): string => code.replace(/^Key|^Digit/, '')

/** In the platform's own order: macOS ⌥⇧⌘ then the key, elsewhere Ctrl, Alt, Shift. */
export function shortcutKeys(binding: KeyBinding, isMac: boolean = isMacPlatform()): readonly string[] {
  if (isMac) {
    return [
      ...(binding.alt ? ['⌥'] : []),
      ...(binding.shift ? ['⇧'] : []),
      ...(binding.mod ? ['⌘'] : []),
      MAC_KEYS[binding.code] ?? bareKey(binding.code),
    ]
  }
  return [
    ...(binding.mod ? ['Ctrl'] : []),
    ...(binding.alt ? ['Alt'] : []),
    ...(binding.shift ? ['Shift'] : []),
    OTHER_KEYS[binding.code] ?? bareKey(binding.code),
  ]
}

/** One label for a binding: `⌥⇧F` / `⌘⏎` on macOS, `Ctrl+Alt+Shift+F` / `Ctrl+Enter` elsewhere. */
export function shortcutLabel(binding: KeyBinding, isMac: boolean = isMacPlatform()): string {
  return shortcutKeys(binding, isMac).join(isMac ? '' : '+')
}

/** The binding as `aria-keyshortcuts` wants it: `Alt+H`, `Meta+Enter` on macOS, `Control+Enter` elsewhere. */
export function ariaKeyShortcut(binding: KeyBinding, isMac: boolean = isMacPlatform()): string {
  return [
    ...(binding.mod ? [isMac ? 'Meta' : 'Control'] : []),
    ...(binding.alt ? ['Alt'] : []),
    ...(binding.shift ? ['Shift'] : []),
    ARIA_KEYS[binding.code] ?? bareKey(binding.code),
  ].join('+')
}
