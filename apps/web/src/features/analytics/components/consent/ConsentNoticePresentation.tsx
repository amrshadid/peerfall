import { Button } from '@shared/components/ui'
import './ConsentNotice.css'

export interface ConsentNoticePresentationProps {
  /** The privacy note in Settings. */
  privacyHref: string
  onAllow: () => void
  onDecline: () => void
}

/** A plate in the corner, not a modal: it never takes focus or covers play, and both answers weigh the same. */
export function ConsentNoticePresentation({ privacyHref, onAllow, onDecline }: ConsentNoticePresentationProps) {
  return (
    <aside className="pf-consent" aria-labelledby="pf-consent-title" aria-describedby="pf-consent-text">
      <p className="pf-consent__label">Notice · Usage recording</p>
      <h2 id="pf-consent-title" className="pf-consent__title">
        Help improve Peerfall?
      </h2>
      <p id="pf-consent-text" className="pf-consent__text">
        Microsoft Clarity would record how you play: clicks, scrolling, the screens you open, and what you type in the
        terminal and the editor, which means your router commands and configuration. It uses cookies. Your progress
        stays in your browser either way.
      </p>
      <div className="pf-consent__actions">
        <Button size="sm" onClick={onAllow}>
          Allow
        </Button>
        <Button size="sm" onClick={onDecline}>
          No thanks
        </Button>
        <a className="pf-consent__link" href={privacyHref}>
          What's recorded?
        </a>
      </div>
    </aside>
  )
}
