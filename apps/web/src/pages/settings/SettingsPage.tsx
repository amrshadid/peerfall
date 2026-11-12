import { SettingsContainer } from '@features/settings'
import type { SettingsSectionId } from '@shared/types'

export interface SettingsPageProps {
  section: SettingsSectionId | null
}

export function SettingsPage({ section }: SettingsPageProps) {
  return <SettingsContainer section={section} />
}
