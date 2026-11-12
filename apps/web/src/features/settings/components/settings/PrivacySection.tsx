import type { SettingsValues } from '@features/settings/types'
import { SectionHead, Segmented } from '@shared/components/ui'
import type { ClarityConsent } from '@shared/types'
import { SettingRow } from './SettingRow'

export interface PrivacySectionProps {
  /** False in a build without a Clarity id: nothing can be recorded, so there is nothing to choose. */
  clarityConfigured: boolean
  consent: ClarityConsent
  onChange: (patch: Partial<SettingsValues>) => void
}

const CONSENT_TEXT: Readonly<Record<ClarityConsent, string>> = {
  unset: 'Not chosen yet: nothing is recorded until you allow it.',
  granted: 'Allowed: Clarity records how you play.',
  denied: 'Not allowed: Clarity is never loaded.',
}

export function PrivacySection({ clarityConfigured, consent, onChange }: PrivacySectionProps) {
  return (
    <section aria-labelledby="settings-privacy-h" className="settings__section" id="settings-privacy">
      <SectionHead id="settings-privacy-h">5 · Privacy</SectionHead>
      {clarityConfigured ? (
        <>
          <SettingRow label="Usage recording" description={CONSENT_TEXT[consent]}>
            <Segmented<ClarityConsent>
              legend="Usage recording"
              value={consent}
              onChange={(clarityConsent) => onChange({ clarityConsent })}
              options={[
                { value: 'granted', label: 'Allow' },
                { value: 'denied', label: "Don't allow" },
              ]}
            />
          </SettingRow>
          <dl className="settings-about">
            <dt>What is recorded</dt>
            <dd>
              Only if you allow it, Microsoft Clarity records how you play: clicks, scrolling, the screens you open, and
              what you type in the terminal and the editor. Microsoft handles that data under its{' '}
              <a href="https://privacy.microsoft.com/privacystatement" target="_blank" rel="noreferrer">
                privacy statement
              </a>
              .
            </dd>
            <dt>Cookies</dt>
            <dd>
              Only after you allow it: Clarity sets _clck and _clsk on this site, and Microsoft may set its own on
              clarity.ms and bing.com. Before that, Clarity isn't loaded at all.
            </dd>
            <dt>Keep it out</dt>
            <dd>Don't type anything private in the terminal or the editor.</dd>
            <dt>Stays in your browser</dt>
            <dd>
              Your saves and progress, your configuration files, and the Machine: its disk, its files and what it runs.
            </dd>
            <dt>Changing your mind</dt>
            <dd>
              Choose above at any time. "Don't allow" stops recording at once, and Clarity isn't loaded on later visits.
            </dd>
          </dl>
        </>
      ) : (
        <dl className="settings-about">
          <dt>What is recorded</dt>
          <dd>Nothing: this copy of the game records nothing.</dd>
          <dt>Stays in your browser</dt>
          <dd>
            Your saves and progress, your configuration files, and the Machine: its disk, its files and what it runs.
          </dd>
        </dl>
      )}
    </section>
  )
}
