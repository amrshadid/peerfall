import { appConfig } from '@app/config'
import { useCheatSheet, useSettings } from '@app/store'
import { useExportSave, useSaveStatus } from '@features/chrome/hooks/save'
import { useScreenChrome } from '@features/chrome/hooks/screen'
import { SettingsPresentation } from '@features/settings/components/settings'
import { useSaveImport } from '@features/settings/hooks/saves'
import type { SettingsValues } from '@features/settings/types'
import { storageTextOf } from '@features/settings/utils/storage'
import { useTour } from '@features/tour/hooks/tour'
import { useSaveActions } from '@peerfall/game/hooks'
import { APP_CONTRIBUTING_URL, APP_ISSUES_URL, APP_REPOSITORY_URL, APP_VERSION_LABEL } from '@shared/constants/app'
import { hrefOf } from '@shared/navigation'
import type { SettingsSectionId } from '@shared/types'
import { SHORTCUTS, shortcutKeys } from '@shared/utils/keyboard'
import { UI_SCALES } from '@shared/utils/settings'
import { useState } from 'react'

/** From the route: `#/settings/saves`, or null for the top of the page. */
export type SettingsSection = SettingsSectionId | null

const CHEAT_SHEET = SHORTCUTS.find((shortcut) => shortcut.id === 'cheat-sheet')
const CHEAT_SHEET_KEYS = CHEAT_SHEET ? shortcutKeys(CHEAT_SHEET.binding) : ['?']
/** What `#/settings` opens on. */
const DEFAULT_SECTION: SettingsSectionId = 'display'
const LINKS = { repository: APP_REPOSITORY_URL, contributing: APP_CONTRIBUTING_URL, issues: APP_ISSUES_URL }

export interface SettingsContainerProps {
  section: SettingsSection
}

export function SettingsContainer({ section }: SettingsContainerProps) {
  const chrome = useScreenChrome()
  const { settings, setTheme, setMotion, setUiScale, setShowAllPanels, setClarityConsent, resetSettings } =
    useSettings()
  const { storageIssue } = useSaveStatus()
  const { reset } = useSaveActions()
  const exportSave = useExportSave()
  const tour = useTour()
  const { openCheatSheet } = useCheatSheet()
  const [message, setMessage] = useState<string | null>(null)
  const saveImport = useSaveImport((imported) =>
    setMessage(imported ? 'Save imported.' : "That save couldn't be imported.")
  )

  const onChange = (patch: Partial<SettingsValues>) => {
    if (patch.theme !== undefined) setTheme(patch.theme)
    if (patch.motion !== undefined) setMotion(patch.motion)
    if (patch.uiScale !== undefined) setUiScale(patch.uiScale)
    if (patch.showAllPanels !== undefined) setShowAllPanels(patch.showAllPanels)
    if (patch.clarityConsent !== undefined) setClarityConsent(patch.clarityConsent)
  }

  return (
    <SettingsPresentation
      chrome={chrome}
      backHref={hrefOf({ name: 'title' })}
      section={section ?? DEFAULT_SECTION}
      values={settings}
      scales={UI_SCALES}
      onChange={onChange}
      storage={storageTextOf(storageIssue)}
      onExport={() => {
        exportSave()
        setMessage('Save exported.')
      }}
      onImportFile={saveImport.choose}
      importPreview={saveImport.preview}
      onImportCancel={saveImport.cancel}
      onImportConfirm={saveImport.confirm}
      onReset={async () => {
        await reset()
        resetSettings()
        setMessage('Everything was reset.')
      }}
      onReplayTours={() => {
        tour.resetSeen()
        setMessage('Tours will play again on each screen.')
      }}
      cheatSheetKeys={CHEAT_SHEET_KEYS}
      onOpenShortcuts={openCheatSheet}
      clarityConfigured={appConfig().clarityId !== null}
      version={APP_VERSION_LABEL}
      links={LINKS}
      message={message}
    />
  )
}
