import { FieldGuideTable } from '@features/codex/components/field-guide'
import { GlossaryList } from '@features/codex/components/glossary'
import type { CodexIndexChapter, CodexPage, CodexTab, FieldGuideRow, GlossaryRow } from '@features/codex/types'
import { CodexCard } from '@shared/components/codex'
import { ManHead, ScreenFrame } from '@shared/components/layout'
import { ButtonLink, Icon, Tabs } from '@shared/components/ui'
import { APP_MANUAL, APP_VERSION_LABEL } from '@shared/constants/app'
import type { ScreenChrome } from '@shared/types'
import { CodexEntries } from './CodexEntries'
import { CodexTitlePageView } from './CodexTitlePageView'
import './Codex.css'

export interface CodexPresentationProps {
  chrome: ScreenChrome
  backHref: string
  filed: number
  total: number
  chapters: readonly CodexIndexChapter[]
  page: CodexPage
  /** The Field Guide's rows; null until the mission of its first command has started. */
  fieldGuide: readonly FieldGuideRow[] | null
  /** Null until the first card is found. */
  glossary: readonly GlossaryRow[] | null
  tab: CodexTab
  onTab: (tab: CodexTab) => void
}

const TAB_ITEMS: readonly { readonly id: CodexTab; readonly label: string }[] = [
  { id: 'cards', label: 'Cards' },
  { id: 'field-guide', label: 'Field Guide' },
  { id: 'glossary', label: 'Glossary' },
]

/** The Codex: a book with one chapter per stage, in play order, and its Field Guide and glossary. */
export function CodexPresentation({
  chrome,
  backHref,
  filed,
  total,
  chapters,
  page,
  fieldGuide,
  glossary,
  tab,
  onTab,
}: CodexPresentationProps) {
  const tabs = TAB_ITEMS.filter(
    (item) => item.id === 'cards' || (item.id === 'field-guide' ? fieldGuide !== null : glossary !== null)
  )
  const select = (id: string) => {
    const item = tabs.find((candidate) => candidate.id === id)
    if (item) {
      onTab(item.id)
    }
  }
  return (
    <ScreenFrame
      page="Peerfall-codex(7)"
      volume={`${APP_MANUAL} · The Codex`}
      chrome={chrome}
      topbar={
        <nav className="screen__topbar" aria-label="Codex">
          <ButtonLink href={backHref} variant="quiet">
            <Icon name="back" />
            Title
          </ButtonLink>
          <h1 tabIndex={-1} className="codex-title">
            Codex
          </h1>
          {tabs.length > 1 && (
            <Tabs label="Codex pages" idPrefix="codex-tab" items={tabs} selected={tab} onSelect={select} />
          )}
          <p className="codex-count">
            {filed} of {total} cards filed
          </p>
        </nav>
      }
      foot={<ManHead kind="foot" left={`${filed} / ${total}`} center={APP_VERSION_LABEL} right="FRR 10.6.1" />}
    >
      {tab === 'field-guide' && fieldGuide !== null ? (
        <main
          className="screen__sheet pf-sheet"
          id="codex-panel-field-guide"
          role="tabpanel"
          aria-labelledby="codex-tab-field-guide"
        >
          <FieldGuideTable rows={fieldGuide} />
        </main>
      ) : tab === 'glossary' && glossary !== null ? (
        <main
          className="screen__sheet pf-sheet"
          id="codex-panel-glossary"
          role="tabpanel"
          aria-labelledby="codex-tab-glossary"
        >
          <GlossaryList rows={glossary} />
        </main>
      ) : (
        <main className="codex screen__sheet pf-sheet">
          <nav className="codex__index" aria-label="Codex chapters">
            {chapters.map((chapter) => (
              <section key={chapter.id} aria-label={chapter.heading}>
                <h2>
                  <a href={chapter.href} aria-current={chapter.current ? 'page' : undefined}>
                    {chapter.heading}
                  </a>
                </h2>
                <p className="codex__count">{chapter.count}</p>
                <CodexEntries entries={chapter.entries} variant="index" />
              </section>
            ))}
          </nav>
          <div className="codex__page">
            {page.kind === 'card' && (
              <>
                {!page.filed && (
                  <p className="codex__note">
                    You've met this one in {page.card.filedIn}. It's filed when you finish the mission.
                  </p>
                )}
                <CodexCard card={page.card} />
              </>
            )}
            {page.kind === 'chapter' && <CodexTitlePageView page={page.chapter} />}
            {page.kind === 'empty' && (
              <div className="codex__empty">
                <h2>No card here yet.</h2>
                <p>
                  Cards are filed as you finish missions. Each one is a real term, the FRR source file behind it, and a
                  way to try it on a real router.
                </p>
              </div>
            )}
          </div>
        </main>
      )}
    </ScreenFrame>
  )
}
