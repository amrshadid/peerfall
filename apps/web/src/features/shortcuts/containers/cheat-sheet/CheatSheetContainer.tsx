import { useCheatSheet } from '@app/store'
import { CheatSheetPresentation } from '@features/shortcuts/components/cheat-sheet'
import { keysOf, shortcutLabelOf } from '@features/shortcuts/utils/keys'
import { useTour } from '@features/tour/hooks/tour'
import type { ShortcutGroup } from '@shared/types'
import { isMacPlatform, SHORTCUTS } from '@shared/utils/keyboard'
import { useMemo } from 'react'

// Long enough for the sheet's dialog to close: a tour never starts over an open dialog.
const TOUR_AFTER_SHEET_MS = 120

export function CheatSheetContainer() {
  const { cheatSheetOpen, closeCheatSheet } = useCheatSheet()
  const tour = useTour()

  const rows = useMemo(() => {
    const isMac = isMacPlatform()
    const of = (group: ShortcutGroup) =>
      SHORTCUTS.filter((shortcut) => shortcut.group === group).map((shortcut) => ({
        action: shortcut.action,
        keys: keysOf(shortcut, isMac),
      }))
    return {
      game: of('Game'),
      terminal: of('Terminal'),
      focusOut: (['focus-guide', 'focus-editor', 'focus-network'] as const).map((id) => shortcutLabelOf(id, isMac)),
    }
  }, [])

  return (
    <CheatSheetPresentation
      open={cheatSheetOpen}
      onClose={closeCheatSheet}
      game={rows.game}
      terminal={rows.terminal}
      focusOut={rows.focusOut}
      onTour={
        tour.screen
          ? () => {
              closeCheatSheet()
              window.setTimeout(() => tour.start('replay'), TOUR_AFTER_SHEET_MS)
            }
          : undefined
      }
    />
  )
}
