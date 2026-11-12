import type { KeyBinding, KeyPress } from '@shared/types/definitions/keys'

/** No extra modifiers allowed. */
export function matches(press: KeyPress, binding: KeyBinding, isMac: boolean): boolean {
  const mod = isMac ? press.metaKey : press.ctrlKey
  const other = isMac ? press.ctrlKey : press.metaKey
  return (
    press.code === binding.code &&
    mod === (binding.mod ?? false) &&
    !other &&
    press.altKey === (binding.alt ?? false) &&
    press.shiftKey === (binding.shift ?? false)
  )
}
