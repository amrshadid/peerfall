import type {
  CodexCardLink,
  CodexCardState,
  CodexChapter,
  CodexChapterCard,
  CodexEntry,
  CodexView,
  GlossaryEntry,
} from '#types/definitions/codex'
import type { GameContent } from '#types/definitions/content'
import type { MissionId } from '#types/definitions/mission'
import type { Progress } from '#types/definitions/progress'
import { findMissionProgress, isCompleted } from '#utils/progress/index'

/** Every card in play order, each with the mission that adds it. */
function allEntries(content: GameContent): readonly CodexEntry[] {
  return content.missions.flatMap((mission) =>
    mission.codex.map((card) => ({ card, missionId: mission.id, missionNumber: content.numberOf(mission.id) ?? '' }))
  )
}

/** A card is filed once its mission is completed, seen once it is started, and hidden before. */
export function cardState(progress: Progress, missionId: MissionId): CodexCardState {
  if (isCompleted(progress, missionId)) {
    return 'filed'
  }
  return findMissionProgress(progress, missionId) ? 'seen' : 'hidden'
}

/** The player's filed cards, in the order their missions were completed. */
export function collectCodex(progress: Progress, content: GameContent): readonly CodexEntry[] {
  const entries = allEntries(content)
  return progress.completionOrder.flatMap((missionId) => entries.filter((entry) => entry.missionId === missionId))
}

/**
 * The whole Codex as chapters, one per stage that adds cards, in play order. Each card is marked
 * filed, seen or hidden for this player and linked both ways along its `deepens` chain.
 */
export function codexChapters(progress: Progress, content: GameContent): readonly CodexChapter[] {
  const entries = allEntries(content)
  const linkOf = (entry: CodexEntry): CodexCardLink => ({
    cardId: entry.card.id,
    term: entry.card.term,
    missionNumber: entry.missionNumber,
    state: cardState(progress, entry.missionId),
  })
  const byId = new Map(entries.map((entry) => [entry.card.id, entry]))
  const withLinks = (entry: CodexEntry): CodexChapterCard => {
    const deepened = entry.card.deepens === undefined ? undefined : byId.get(entry.card.deepens)
    return {
      ...entry,
      state: cardState(progress, entry.missionId),
      deepens: deepened ? linkOf(deepened) : null,
      deepenedBy: entries.filter((later) => later.card.deepens === entry.card.id).map(linkOf),
    }
  }
  return content.chapters.flatMap((chapter): CodexChapter[] => {
    const missions = content.missionsIn(chapter.id)
    const cards = entries.filter((entry) => missions.some((mission) => mission.id === entry.missionId)).map(withLinks)
    if (cards.length === 0) {
      return []
    }
    const finished = missions.every((mission) => isCompleted(progress, mission.id))
    return [
      {
        chapter,
        cards,
        filed: cards.filter((card) => card.state === 'filed').length,
        total: cards.length,
        finished,
        youCanNow: finished ? chapter.outcomes : [],
      },
    ]
  })
}

// Backticks and case don't decide where a term sorts: `vtysh` sits with the v's.
const sortKey = (term: string): string => term.replace(/[`*_]/g, '').toLowerCase()

/** The terms of every card found so far, filed or seen, in alphabetical order. */
export function glossaryOf(chapters: readonly CodexChapter[]): readonly GlossaryEntry[] {
  return chapters
    .flatMap((chapter) => chapter.cards)
    .filter((entry) => entry.state !== 'hidden')
    .map((entry) => ({
      term: entry.card.term,
      simple: entry.card.simple,
      cardId: entry.card.id,
      missionNumber: entry.missionNumber,
    }))
    .sort((first, second) => sortKey(first.term).localeCompare(sortKey(second.term)))
}

/** The Codex as the player has it: chapters, glossary and the count of cards filed. */
export function codexView(progress: Progress, content: GameContent): CodexView {
  const chapters = codexChapters(progress, content)
  return {
    chapters,
    glossary: glossaryOf(chapters),
    filed: chapters.reduce((sum, chapter) => sum + chapter.filed, 0),
    total: chapters.reduce((sum, chapter) => sum + chapter.total, 0),
  }
}
