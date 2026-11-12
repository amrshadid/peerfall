import type { SettingsValues } from '@features/settings/types'
import { Button, SectionHead, Segmented } from '@shared/components/ui'
import { SettingRow } from './SettingRow'

export interface GameplaySectionProps {
  showAllPanels: boolean
  onChange: (patch: Partial<SettingsValues>) => void
  /** Forgets the guided tours already shown, so each screen tours again. */
  onReplayTours: () => void
}

export function GameplaySection({ showAllPanels, onChange, onReplayTours }: GameplaySectionProps) {
  return (
    <section aria-labelledby="settings-gameplay-h" className="settings__section" id="settings-gameplay">
      <SectionHead id="settings-gameplay-h">2 · Gameplay</SectionHead>
      <SettingRow
        label="Panels"
        description="The topology and the timeline open when the mission reaches them, so a new player meets one thing at a time."
      >
        <Segmented
          legend="Panels"
          value={showAllPanels ? 'all' : 'mission'}
          onChange={(panels) => onChange({ showAllPanels: panels === 'all' })}
          options={[
            { value: 'mission', label: 'Open with the mission' },
            { value: 'all', label: 'Show all panels' },
          ]}
        />
      </SettingRow>
      <SettingRow
        label="Guided tours"
        description="Each screen shows a short tour the first time you reach it; its Tour button plays it again."
      >
        <Button onClick={onReplayTours}>Show every tour again</Button>
      </SettingRow>
    </section>
  )
}
