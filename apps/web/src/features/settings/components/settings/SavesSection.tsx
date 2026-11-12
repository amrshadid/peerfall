import { Button, SectionHead } from '@shared/components/ui'
import type { ChangeEvent } from 'react'
import { SettingRow } from './SettingRow'

export interface SavesSectionProps {
  /** Where saves go, e.g. "Saved in this browser", or why they don't. */
  storage: string
  onExport: () => void
  onImportFile: (text: string) => void
  onResetRequest: () => void
}

export function SavesSection({ storage, onExport, onImportFile, onResetRequest }: SavesSectionProps) {
  const onFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    // Cleared at once, so choosing the same file again still fires a change.
    event.target.value = ''
    if (file) {
      onImportFile(await file.text())
    }
  }

  return (
    <section aria-labelledby="settings-saves-h" className="settings__section" id="settings-saves">
      <SectionHead id="settings-saves-h" aside={storage}>
        4 · Saves
      </SectionHead>
      <SettingRow
        label="Export or import"
        description="Progress saves itself after every step. Export a copy to move your game or keep it safe: Safari may clear site data after a week without a visit."
      >
        <Button onClick={onExport}>Export save</Button>
        <label className="pf-btn pf-btn--default pf-btn--md settings__file">
          Import save…
          <input type="file" accept="application/json,.json" onChange={onFile} />
        </label>
      </SettingRow>
      <SettingRow
        label="Reset everything"
        description="Clears your progress and settings in this browser. You can export a copy first."
        tone="danger"
      >
        <Button onClick={onResetRequest}>Reset everything…</Button>
      </SettingRow>
    </section>
  )
}
