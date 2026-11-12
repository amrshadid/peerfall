import type { JourneyChapter, JourneyChapterSource, JourneyNeed, JourneyStop, Tone } from '@features/map/types'
import { partsOf } from '@features/map/utils/parts'
import type { ChapterDefinition, MissionId, MissionStatus } from '@peerfall/game/types'
import { DONE_STATES, HERE_WORDS, PLANNED_PROGRESS, PLANNED_STOP, STATUS_WORDS } from './journey.constants'

export function isDone(stop: Pick<JourneyStop, 'state'>): boolean {
  return DONE_STATES.has(stop.state)
}

/** The shape a mission is drawn in: a completed one says whether it took hints, or passed first time. */
export function markStateOf(status: MissionStatus, attempts: number, hintsUsed: number): JourneyStop['state'] {
  switch (status) {
    case 'locked':
      return 'locked'
    case 'available':
      return 'available'
    case 'in_progress':
      return 'progress'
    case 'completed':
      if (hintsUsed > 0) {
        return 'helped'
      }
      return attempts <= 1 ? 'clean' : 'done'
  }
}

/** The key of the planned stop of a stage with no missions yet. */
export function plannedKeyOf(chapterId: string): string {
  return `planned:${chapterId}`
}

/** The one stop of a stage with no missions yet: it keeps the stage's place on the road. */
export function plannedStopOf(chapter: ChapterDefinition): JourneyStop {
  return {
    key: plannedKeyOf(chapter.id),
    planned: true,
    number: String(chapter.stage),
    title: PLANNED_STOP.title,
    chapterId: chapter.id,
    stage: chapter.stage,
    state: 'locked',
    status: PLANNED_STOP.status,
    playable: false,
    here: false,
    summary: chapter.summary,
    needs: [],
    attempts: 0,
    hintsUsed: 0,
    recoveryTargetMs: 0,
  }
}

/** The road is inked up to the last stop that isn't locked. */
export function isReached(stop: Pick<JourneyStop, 'state'>): boolean {
  return stop.state !== 'locked'
}

/** No missions: planned; every one done: passed; any done or open: in progress; else still ahead. */
export function toneOf(stops: readonly Pick<JourneyStop, 'state'>[]): Tone {
  if (stops.length === 0) {
    return 'planned'
  }
  const done = stops.filter(isDone).length
  if (done === stops.length) {
    return 'passed'
  }
  return done > 0 || stops.some(isReached) ? 'progress' : 'ahead'
}

/** "1 of 1 passed"; a stage without missions says it is planned. */
export function progressOf(done: number, total: number): string {
  return total === 0 ? PLANNED_PROGRESS : `${done} of ${total} passed`
}

/**
 * The journey as the map draws it: every stage in play order with its missions as stops. A stage
 * with no missions yet is kept, as planned. `next` is where Continue goes: the "You are here" stop.
 */
export function journeyChapters(
  chapters: readonly JourneyChapterSource[],
  next: { readonly id: MissionId } | null
): readonly JourneyChapter[] {
  const entries = chapters.flatMap((entry) => entry.missions)
  const needOf = (id: MissionId): JourneyNeed => {
    const entry = entries.find((candidate) => candidate.mission.id === id)
    // A prerequisite the content doesn't list is named by its id and stays unmet.
    return { id, title: entry?.mission.title ?? id, met: entry?.status === 'completed' }
  }

  return chapters.map(({ chapter, missions }) => {
    const stops = missions.map(({ mission, status, attempts, hintsUsed }, index): JourneyStop => {
      const state = markStateOf(status, attempts, hintsUsed)
      const here = mission.id === next?.id
      return {
        key: mission.id,
        planned: false,
        number: `${chapter.stage}.${index + 1}`,
        title: mission.title,
        chapterId: chapter.id,
        stage: chapter.stage,
        state,
        status: here ? `${STATUS_WORDS[state]}, ${HERE_WORDS}` : STATUS_WORDS[state],
        playable: status !== 'locked',
        here,
        summary: mission.objective,
        needs: mission.prerequisites.map(needOf),
        attempts,
        hintsUsed,
        recoveryTargetMs: mission.recoveryTargetMs,
      }
    })
    const done = stops.filter(isDone).length
    const progress = progressOf(done, stops.length)
    return {
      id: chapter.id,
      stage: chapter.stage,
      kicker: `Stage ${chapter.stage} of ${chapters.length}`,
      name: chapter.title,
      caption: chapter.summary,
      parts: partsOf(chapter.id),
      stops,
      marks: stops.length === 0 ? [plannedStopOf(chapter)] : stops,
      done,
      total: stops.length,
      tone: toneOf(stops),
      progress,
      planned: stops.length === 0,
      summary: `Stage ${chapter.stage}, ${chapter.title}. ${chapter.summary} ${progress}.`,
      hasHere: stops.some((stop) => stop.here),
    }
  })
}

export function journeyStops(chapters: readonly JourneyChapter[]): readonly JourneyStop[] {
  return chapters.flatMap((chapter) => chapter.stops)
}

/** Every stop the map draws, in travel order: the missions, and a planned stop for each stage without any. */
export function journeyMarks(chapters: readonly JourneyChapter[]): readonly JourneyStop[] {
  return chapters.flatMap((chapter) => chapter.marks)
}

/** The stage of where Continue goes, else of the last mission completed, else the first stage with missions. */
export function currentChapter(chapters: readonly JourneyChapter[]): JourneyChapter | null {
  return (
    chapters.find((chapter) => chapter.hasHere) ??
    [...chapters].reverse().find((chapter) => chapter.done > 0) ??
    chapters.find((chapter) => !chapter.planned) ??
    chapters[0] ??
    null
  )
}

/** The status foot: "Stage 4, Recover from failure: 0 of 1 missions passed · 10 stages planned". */
export function journeySummary(chapters: readonly JourneyChapter[]): string {
  const current = currentChapter(chapters)
  if (!current) {
    return 'The journey is not loaded yet'
  }
  const planned = chapters.filter((chapter) => chapter.planned).length
  const here = current.planned
    ? `Stage ${current.stage}, ${current.name}: planned`
    : `Stage ${current.stage}, ${current.name}: ${current.done} of ${current.total} ${current.total === 1 ? 'mission' : 'missions'} passed`
  return planned === 0 ? here : `${here} · ${planned} ${planned === 1 ? 'stage' : 'stages'} planned`
}
