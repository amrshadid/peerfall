import type { CodexEntry, CodexIndexChapter, CodexPage, FieldGuideRow, GlossaryRow } from '@features/codex/types'
import { speakerOf } from '@features/guide/utils/story'
import type {
  CodexChapter,
  CodexChapterCard,
  CodexView,
  FieldGuideEntry,
  CodexCardLink as GameCardLink,
  GlossaryEntry,
} from '@peerfall/game/types'
import { hrefOf } from '@shared/navigation'
import type { CodexCardData, CodexCardLink } from '@shared/types'
import { FIELD_GUIDE_WHERE, FRR_SOURCE_BASE } from './codex-book.constants'

/** What the Codex is open at, from its address. */
export interface CodexSelection {
  readonly cardId: string | null
  readonly chapterId: string | null
}

/** "1.3 The Silent Router", from a mission id. */
export type MissionLabel = (missionId: string) => string

/** A path in FRR's tree, linked to the pinned release on GitHub. */
export function frrSourceUrl(path: string): string {
  return `${FRR_SOURCE_BASE}${path.replace(/^\/+/, '')}`
}

const cardHref = (cardId: string) => hrefOf({ name: 'codex', cardId })

const found = (entry: { readonly state: string }) => entry.state !== 'hidden'

function linkOf(link: GameCardLink): CodexCardLink {
  return found(link)
    ? { term: link.term, href: cardHref(link.cardId), missionNumber: link.missionNumber }
    : { term: null, href: null, missionNumber: link.missionNumber }
}

/** A card the player has found, as the man page prints it. */
export function cardDataOf(entry: CodexChapterCard, label: MissionLabel): CodexCardData {
  const { card } = entry
  return {
    id: card.id,
    term: card.term,
    simple: card.simple,
    deep: card.deep ?? null,
    sources: card.sources.map((path) => ({ path, href: frrSourceUrl(path) })),
    docs: card.docs ?? null,
    tryIt: card.tryIt ?? null,
    deepens: entry.deepens ? linkOf(entry.deepens) : null,
    deepenedBy: entry.deepenedBy.map(linkOf),
    filedIn: label(entry.missionId),
  }
}

function entriesOf(chapter: CodexChapter, selectedCard: string | null): readonly CodexEntry[] {
  return chapter.cards.map((entry) =>
    found(entry)
      ? {
          key: entry.card.id,
          state: entry.state === 'filed' ? 'filed' : 'seen',
          term: entry.card.term,
          href: cardHref(entry.card.id),
          missionNumber: entry.missionNumber,
          current: entry.card.id === selectedCard,
        }
      : // The id stays out of the page: a blank outline gives nothing away.
        {
          key: `${chapter.chapter.id}-${entry.missionNumber}-${chapter.cards.indexOf(entry)}`,
          state: 'blank',
          term: null,
          href: null,
          missionNumber: entry.missionNumber,
          current: false,
        }
  )
}

const countOf = (chapter: CodexChapter) => `${chapter.filed} / ${chapter.total} filed`

/** A found card by id; a hidden one is never shown, even from its address. */
function foundCard(view: CodexView, cardId: string | null): CodexChapterCard | undefined {
  if (cardId === null) {
    return undefined
  }
  return view.chapters.flatMap((chapter) => chapter.cards).find((entry) => found(entry) && entry.card.id === cardId)
}

/**
 * The chapter on show: the one asked for, else the latest one with a card found, else the first.
 * Null when a card is on show instead.
 */
function shownChapter(view: CodexView, selection: CodexSelection): CodexChapter | undefined {
  if (foundCard(view, selection.cardId)) {
    return undefined
  }
  const asked = view.chapters.find((chapter) => chapter.chapter.id === selection.chapterId)
  return asked ?? view.chapters.findLast((chapter) => chapter.cards.some(found)) ?? view.chapters[0]
}

/** The Codex's index: every chapter in play order, its cards in teaching order. */
export function codexIndexOf(view: CodexView, selection: CodexSelection): readonly CodexIndexChapter[] {
  const selected = foundCard(view, selection.cardId)?.card.id ?? null
  const chapterShown = shownChapter(view, selection)
  return view.chapters.map((chapter) => ({
    id: chapter.chapter.id,
    heading: `Stage ${chapter.chapter.stage} · ${chapter.chapter.title}`,
    href: hrefOf({ name: 'codex', cardId: null, chapter: chapter.chapter.id }),
    count: countOf(chapter),
    entries: entriesOf(chapter, selected),
    current: chapterShown?.chapter.id === chapter.chapter.id,
  }))
}

/** The page beside the index: the card asked for, or a chapter's title page. */
export function codexPageOf(view: CodexView, selection: CodexSelection, label: MissionLabel): CodexPage {
  const card = foundCard(view, selection.cardId)
  if (card) {
    return { kind: 'card', card: cardDataOf(card, label), filed: card.state === 'filed' }
  }
  const chapter = shownChapter(view, selection)
  if (!chapter) {
    return { kind: 'empty' }
  }
  const { chapter: definition } = chapter
  const guide = definition.guide ? speakerOf(definition.guide) : null
  return {
    kind: 'chapter',
    chapter: {
      id: definition.id,
      kicker: `Stage ${definition.stage}`,
      title: definition.title,
      story: definition.story ?? null,
      guide: guide ? { name: guide.name, term: guide.term } : null,
      standsFor: definition.standsFor ?? null,
      count: countOf(chapter),
      entries: entriesOf(chapter, null),
      youCanNow: chapter.finished ? chapter.youCanNow : [],
    },
  }
}

/** The Field Guide's rows: the commands met so far, in the guide's order. */
export function fieldGuideRowsOf(entries: readonly FieldGuideEntry[], label: MissionLabel): readonly FieldGuideRow[] {
  return entries.map((entry) => ({
    name: entry.name,
    where: FIELD_GUIDE_WHERE[entry.kind],
    what: entry.what,
    firstMet: label(entry.firstMet),
    deepenedIn: entry.deepenedIn.map(label),
  }))
}

export function glossaryRowsOf(entries: readonly GlossaryEntry[]): readonly GlossaryRow[] {
  return entries.map((entry) => ({
    term: entry.term,
    simple: entry.simple,
    href: cardHref(entry.cardId),
    missionNumber: entry.missionNumber,
  }))
}
