import { useTheme } from '@app/theme'
import { useExportSave, useSaveStatus } from '@features/chrome/hooks/save'
import { useTour } from '@features/tour/hooks/tour'
import type { ScreenChrome } from '@shared/types'

export function useScreenChrome(): ScreenChrome {
  const { isDark, toggleTheme } = useTheme()
  const { storageIssue } = useSaveStatus()
  const onExport = useExportSave()
  const tour = useTour()

  return {
    // The button names the print it switches to.
    themeLabel: isDark ? 'Day print' : 'Night print',
    onToggleTheme: toggleTheme,
    storageIssue,
    onExport,
    onTour: tour.screen ? () => tour.start('replay') : null,
  }
}
