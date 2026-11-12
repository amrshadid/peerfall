import type { SettingsValues } from '@features/settings/types'
import { SectionHead, Segmented } from '@shared/components/ui'
import { formatPercent } from '@shared/utils/format'
import { SettingRow } from './SettingRow'

export interface DisplaySectionProps {
  values: SettingsValues
  scales: readonly number[]
  onChange: (patch: Partial<SettingsValues>) => void
}

export function DisplaySection({ values, scales, onChange }: DisplaySectionProps) {
  return (
    <section aria-labelledby="settings-display-h" className="settings__section" id="settings-display">
      <SectionHead id="settings-display-h">1 · Display</SectionHead>
      <SettingRow label="Theme" description="Day print is ink on paper; Night print is the same manual for the dark.">
        <Segmented
          legend="Theme"
          value={values.theme}
          onChange={(theme) => onChange({ theme })}
          options={[
            { value: 'system', label: 'Follow the system' },
            { value: 'light', label: 'Day print' },
            { value: 'dark', label: 'Night print' },
          ]}
        />
      </SettingRow>
      <SettingRow label="Text size" description="Scales every screen, the terminal included.">
        <Segmented
          legend="Text size"
          value={String(values.uiScale)}
          onChange={(scale) => onChange({ uiScale: Number(scale) })}
          options={scales.map((scale) => ({ value: String(scale), label: formatPercent(scale) }))}
        />
      </SettingRow>
      <SettingRow
        label="Motion"
        description="Reduce motion stops the map's and the tours' animations; nothing in the game depends on them."
      >
        <Segmented
          legend="Motion"
          value={values.motion}
          onChange={(motion) => onChange({ motion })}
          options={[
            { value: 'system', label: 'Follow the system' },
            { value: 'reduce', label: 'Reduce motion' },
          ]}
        />
      </SettingRow>
    </section>
  )
}
