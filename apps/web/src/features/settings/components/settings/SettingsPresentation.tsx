import type { ImportPreview, SettingsValues } from '@features/settings/types'
import { ManHead, ScreenFrame } from '@shared/components/layout'
import { Dialog } from '@shared/components/modals'
import { Button, ButtonLink, Icon } from '@shared/components/ui'
import { APP_MANUAL } from '@shared/constants/app'
import { hrefOf } from '@shared/navigation'
import { type ScreenChrome, SETTINGS_SECTIONS, type SettingsSectionId } from '@shared/types'
import { useState } from 'react'
import { type AboutLinks, AboutSection } from './AboutSection'
import { DisplaySection } from './DisplaySection'
import { GameplaySection } from './GameplaySection'
import { KeyboardSection } from './KeyboardSection'
import { PrivacySection } from './PrivacySection'
import { ResetDialog } from './ResetDialog'
import { SavesSection } from './SavesSection'
import './Settings.css'

const CONTENTS_LABELS: Readonly<Record<SettingsSectionId, string>> = {
  display: 'Display',
  gameplay: 'Gameplay',
  keyboard: 'Keyboard',
  saves: 'Saves',
  privacy: 'Privacy',
  about: 'About',
}

export interface SettingsPresentationProps {
  chrome: ScreenChrome
  backHref: string
  /** The one section on show, picked from the contents. */
  section: SettingsSectionId
  values: SettingsValues
  scales: readonly number[]
  onChange: (patch: Partial<SettingsValues>) => void
  /** Where saves go, e.g. "Saved in this browser", or why they don't. */
  storage: string
  onExport: () => void
  onImportFile: (text: string) => void
  importPreview: ImportPreview | null
  onImportConfirm: () => void
  onImportCancel: () => void
  onReset: () => void
  /** Forgets the guided tours already shown, so each screen tours again. */
  onReplayTours: () => void
  cheatSheetKeys: readonly string[]
  onOpenShortcuts: () => void
  /** Whether this build can record sessions with Clarity, so there is something to choose. */
  clarityConfigured: boolean
  /** "Peerfall 0.1.0", from the app's package.json. */
  version: string
  links: AboutLinks
  message: string | null
}

/** Every change applies at once: no Save button. */
export function SettingsPresentation(props: SettingsPresentationProps) {
  const { chrome, backHref, values, scales, onChange } = props
  const [resetOpen, setResetOpen] = useState(false)

  return (
    <ScreenFrame
      page="Peerfall-settings(5)"
      volume={`${APP_MANUAL} · Settings`}
      chrome={chrome}
      topbar={
        <nav className="screen__topbar" aria-label="Settings">
          <ButtonLink href={backHref} variant="quiet">
            <Icon name="back" />
            Title
          </ButtonLink>
          <h1 tabIndex={-1} className="settings-title">
            Settings
          </h1>
          {props.message !== null && (
            <p className="settings-message" role="status">
              {props.message}
            </p>
          )}
        </nav>
      }
      foot={
        <ManHead
          kind="foot"
          left="Changes apply at once."
          center="Your progress stays in your browser. No accounts."
          right={props.version}
        />
      }
    >
      <main className="settings screen__sheet pf-sheet">
        <nav className="settings__contents" aria-label="Settings sections">
          <p className="settings__contents-title">Contents</p>
          <ol>
            {SETTINGS_SECTIONS.map((id) => (
              <li key={id}>
                <a
                  href={hrefOf({ name: 'settings', section: id })}
                  aria-current={props.section === id ? 'page' : undefined}
                >
                  {CONTENTS_LABELS[id]}
                </a>
              </li>
            ))}
          </ol>
        </nav>
        <div className="settings__body">
          {props.section === 'display' && <DisplaySection values={values} scales={scales} onChange={onChange} />}
          {props.section === 'gameplay' && (
            <GameplaySection
              showAllPanels={values.showAllPanels}
              onChange={onChange}
              onReplayTours={props.onReplayTours}
            />
          )}
          {props.section === 'keyboard' && (
            <KeyboardSection cheatSheetKeys={props.cheatSheetKeys} onOpenShortcuts={props.onOpenShortcuts} />
          )}
          {props.section === 'saves' && (
            <SavesSection
              storage={props.storage}
              onExport={props.onExport}
              onImportFile={props.onImportFile}
              onResetRequest={() => setResetOpen(true)}
            />
          )}
          {props.section === 'privacy' && (
            <PrivacySection
              clarityConfigured={props.clarityConfigured}
              consent={values.clarityConsent}
              onChange={onChange}
            />
          )}
          {props.section === 'about' && (
            <AboutSection version={props.version} storage={props.storage} links={props.links} />
          )}
        </div>
      </main>

      <Dialog
        open={props.importPreview !== null}
        onClose={props.onImportCancel}
        title="Import this save?"
        actions={
          <>
            <Button variant="quiet" onClick={props.onImportCancel}>
              Cancel
            </Button>
            <Button onClick={props.onExport}>Export current first</Button>
            <Button variant="primary" onClick={props.onImportConfirm} disabled={!props.importPreview?.valid}>
              Replace my game
            </Button>
          </>
        }
      >
        <p>{props.importPreview?.summary}</p>
        {props.importPreview?.valid && <p>This replaces your current game in this browser.</p>}
      </Dialog>

      <ResetDialog
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        onExport={props.onExport}
        onReset={props.onReset}
      />
    </ScreenFrame>
  )
}
