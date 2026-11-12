import type { TitleFigure, TitleStart } from '@features/title/types'
import { TopologyFigure } from '@features/topology/components/topology'
import { ManHead, ScreenFrame } from '@shared/components/layout'
import { ButtonLink, ContentsList, Wordmark } from '@shared/components/ui'
import { APP_MANUAL, APP_NAME, APP_PAGE } from '@shared/constants/app'
import type { ContentsEntry, ScreenChrome } from '@shared/types'
import './Title.css'

export interface TitlePresentationProps {
  chrome: ScreenChrome
  start: TitleStart
  contents: readonly ContentsEntry[]
  /** Fig. 1: a network as the missions draw it. */
  figure: TitleFigure
  /** What the figure's lines mean, in words. */
  figureKey: string
  /** Where saves go, e.g. "Saved in this browser", or why they don't. */
  storageText: string
  onShortcuts: () => void
}

/** The cover of the manual: the wordmark cut in section, the contents, and Fig. 1. */
export function TitlePresentation({
  chrome,
  start,
  contents,
  figure,
  figureKey,
  storageText,
  onShortcuts,
}: TitlePresentationProps) {
  return (
    <ScreenFrame
      page={APP_PAGE}
      volume={APP_MANUAL}
      chrome={chrome}
      foot={
        <ManHead
          kind="foot"
          left={storageText}
          center="Your progress stays in your browser. No accounts, no server."
          right={
            <button type="button" className="title__shortcuts" onClick={onShortcuts}>
              Shortcuts <kbd>?</kbd>
            </button>
          }
        />
      }
    >
      <main className="title screen__sheet pf-sheet" aria-labelledby="title-h1">
        <div className="title__wordmark">
          <h1 id="title-h1" className="pf-visually-hidden" tabIndex={-1}>
            {APP_NAME}
          </h1>
          <Wordmark />
          <div className="title__tagline-row">
            <p className="title__tagline">Build networks, diagnose outages and verify recovery.</p>
            <p className="title__key">
              Real <b>FRRouting</b> on real Linux, in this browser.
              <br />
              Nothing to install.
            </p>
          </div>
        </div>

        <div className="title__lower">
          <nav className="title__menu" aria-label="Main menu">
            <div className="title__continue">
              <ButtonLink href={start.href} variant="primary" size="lg" data-primary>
                {start.label}
              </ButtonLink>
              <p className="title__where">{start.where}</p>
              <p className="title__step">{start.note}</p>
            </div>
            <ContentsList headingId="title-contents" heading="Contents" entries={contents} />
          </nav>

          <figure className="title__drawing">
            <TopologyFigure network={figure.network} linkStates={figure.linkStates} activePath={figure.activePath} />
            <figcaption>
              <span>{figure.caption}</span>
              <span>{figureKey}</span>
            </figcaption>
          </figure>
        </div>
      </main>
    </ScreenFrame>
  )
}
