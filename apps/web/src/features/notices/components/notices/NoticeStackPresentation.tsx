import type { Notice } from '@features/notices/types'
import { StatusMark } from '@shared/components/ui'
import './NoticeStack.css'

export interface NoticeStackPresentationProps {
  notice: Notice | null
  /** How many more wait behind it. */
  waiting: number
  onDismiss: (id: string) => void
}

/** Outside every panel, so nothing the player is reading is covered. Never takes focus; read out politely. */
export function NoticeStackPresentation({ notice, waiting, onDismiss }: NoticeStackPresentationProps) {
  return (
    <section className="pf-notices" aria-label="Notices" aria-live="polite">
      {notice && (
        <article key={notice.id} className={`pf-notice pf-notice--${notice.kind}`} title={notice.text}>
          {notice.kind !== 'info' && (
            <span className="pf-notice__mark" aria-hidden="true">
              {notice.kind === 'save-failed' ? '▲' : <StatusMark passed />}
            </span>
          )}
          <p className="pf-notice__body">
            <span className="pf-notice__kicker">{notice.kicker}</span>{' '}
            <span className="pf-notice__text">{notice.text}</span>
          </p>
          {waiting > 0 && <span className="pf-notice__more">+{waiting} more</span>}
          <button
            type="button"
            className="pf-notice__close"
            aria-label={`Dismiss: ${notice.kicker}`}
            onClick={() => onDismiss(notice.id)}
          >
            ×
          </button>
        </article>
      )}
    </section>
  )
}
