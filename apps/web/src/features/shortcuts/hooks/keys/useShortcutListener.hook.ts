import { useAppStore } from '@app/store'
import { isQuestionMark, isTextField } from '@features/shortcuts/utils/keys'
import { isMacPlatform, matches, SHORTCUTS } from '@shared/utils/keyboard'
import { useEffect } from 'react'

/** One keydown listener for the whole app; screens register handlers by id. */
export function useShortcutListener(): void {
  useEffect(() => {
    const isMac = isMacPlatform()
    const openCheatSheet = () => useAppStore.getState().openCheatSheet()
    const onKeyDown = (event: KeyboardEvent) => {
      if (isQuestionMark(event) && !isTextField(event.target)) {
        event.preventDefault()
        openCheatSheet()
        return
      }
      const shortcut = SHORTCUTS.find((candidate) => candidate.id !== null && matches(event, candidate.binding, isMac))
      if (!shortcut?.id) {
        return
      }
      // Every key the game owns, handled on this screen or not: Cmd/Ctrl+S must never open
      // "Save page", and Chrome on Windows opens its menu on Alt+E or Alt+F unless the page takes them.
      event.preventDefault()
      const handler =
        shortcut.id === 'cheat-sheet' ? openCheatSheet : useAppStore.getState().shortcutHandlers[shortcut.id]
      handler?.()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
}
