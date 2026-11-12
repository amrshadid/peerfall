import { Button, Kbd, SectionHead } from '@shared/components/ui'
import { SettingRow } from './SettingRow'

export interface KeyboardSectionProps {
  /** The cheat sheet's own keys, as this platform prints them: ["⌥", "/"] or ["Alt", "/"]. */
  cheatSheetKeys: readonly string[]
  onOpenShortcuts: () => void
}

export function KeyboardSection({ cheatSheetKeys, onOpenShortcuts }: KeyboardSectionProps) {
  return (
    <section aria-labelledby="settings-keyboard-h" className="settings__section" id="settings-keyboard">
      <SectionHead id="settings-keyboard-h">3 · Keyboard</SectionHead>
      <SettingRow
        label="Shortcuts"
        description={
          <>
            Every screen works from the keyboard. Press <Kbd keys={cheatSheetKeys} />, or <Kbd keys={['?']} /> outside a
            text field, for the full list.
          </>
        }
      >
        <Button onClick={onOpenShortcuts}>Show the shortcuts</Button>
      </SettingRow>
    </section>
  )
}
