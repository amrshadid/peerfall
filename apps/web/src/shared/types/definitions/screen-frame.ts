import type { StorageIssue } from './save'

export interface ScreenChrome {
  /** The theme the button switches to: "Night print" or "Day print". */
  readonly themeLabel: string
  readonly onToggleTheme: () => void
  readonly storageIssue: StorageIssue | null
  /** Downloads the save; `null` where there is nothing to export. */
  readonly onExport: (() => void) | null
  /** `null` when the screen has no tour. */
  readonly onTour: (() => void) | null
}
