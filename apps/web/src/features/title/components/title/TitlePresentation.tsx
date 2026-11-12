import { MapOverview, type MapOverviewProps } from '@features/map'
import type { ContinueTarget, FirstMission } from '@features/title/types'
import { ManHead, ScreenFrame } from '@shared/components/layout'
import { Dialog } from '@shared/components/modals'
import { Button, ButtonLink, ContentsList, Wordmark } from '@shared/components/ui'
import { APP_NAME, APP_PAGE, APP_REPOSITORY_URL } from '@shared/constants/app'
import type { ContentsEntry, ScreenChrome } from '@shared/types'
import './Title.css'

export interface NewGameDialog {
  readonly open: boolean
  onExportAndStart(): void
  onStart(): void
  onCancel(): void
}

export interface TitlePresentationProps {
  chrome: ScreenChrome
  /** The stage the player is in, as a volume: "Stage 4: Recover from failure". */
  volume: string
  /** `null` on a first visit: New game becomes the primary action. */
  continueTo: ContinueTarget | null
  /** Where New game starts, for the lines under it on a first visit. */
  firstMission: FirstMission
  onNewGame: () => void
  contents: readonly ContentsEntry[]
  /** Fig. 1: the map around "you". */
  figure: MapOverviewProps
  newGame: NewGameDialog
  saveText: string
  onShortcuts: () => void
  privacyHref: string
}

/** The cover of the manual: the wordmark cut in section, the contents, and Fig. 1. */
export function TitlePresentation({
  chrome,
  volume,
  continueTo,
  firstMission,
  onNewGame,
  contents,
  figure,
  newGame,
  saveText,
  onShortcuts,
  privacyHref,
}: TitlePresentationProps) {
  return (
    <ScreenFrame
      page={APP_PAGE}
      volume={`Network Manual · ${volume}`}
      chrome={chrome}
      foot={
        <ManHead
          kind="foot"
          left={saveText}
          center={
            <>
              Your progress stays in your browser. No accounts.{' '}
              <a className="title__privacy" href={privacyHref}>
                Privacy
              </a>
            </>
          }
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
            <figure className="title__tagline">
              <blockquote cite="https://lkml.org/lkml/2000/8/25/132">
                <p>
                  Talk is cheap.{' '}
                  <a href={APP_REPOSITORY_URL} target="_blank" rel="noreferrer">
                    Show me the code.
                  </a>
                </p>
              </blockquote>
              <figcaption>Linus Torvalds, on the linux-kernel list, 2000</figcaption>
            </figure>
            <p className="title__key">
              Learn FRRouting on a real network.
              <br />
              Section line <b>A–A</b>: where a link fails.
            </p>
          </div>
        </div>

        <div className="title__lower">
          <nav className="title__menu" aria-label="Main menu">
            {continueTo ? (
              <div className="title__continue">
                <ButtonLink href={continueTo.href} variant="primary" size="lg" data-primary>
                  Continue
                </ButtonLink>
                <p className="title__where">{continueTo.where}</p>
                <p className="title__step">{continueTo.step}</p>
              </div>
            ) : (
              <div className="title__continue">
                <Button variant="primary" size="lg" onClick={onNewGame} data-primary>
                  New game
                </Button>
                <p className="title__where">{firstMission.where}</p>
                <p className="title__step">{firstMission.step}</p>
              </div>
            )}
            <ContentsList headingId="title-contents" heading="Contents" entries={contents} />
          </nav>

          <figure className="title__drawing">
            <MapOverview {...figure} />
            <figcaption>
              <span>Fig. 1. The map around you. Select it to open the whole map.</span>
              <span>Solid: passed. Hatched: ahead. Red: you.</span>
            </figcaption>
          </figure>
        </div>
      </main>

      <Dialog
        open={newGame.open}
        title="Start a new game?"
        onClose={newGame.onCancel}
        actions={
          <>
            <Button variant="quiet" onClick={newGame.onCancel}>
              Cancel
            </Button>
            <Button onClick={newGame.onStart}>Start over</Button>
            <Button variant="primary" onClick={newGame.onExportAndStart}>
              Export and start over
            </Button>
          </>
        }
      >
        <p>This replaces your current game. Export it first to keep a copy you can import later.</p>
      </Dialog>
    </ScreenFrame>
  )
}
