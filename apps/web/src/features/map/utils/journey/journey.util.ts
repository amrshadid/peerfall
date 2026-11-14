import type {
  JourneyChapter,
  JourneyChapterSource,
  JourneyNeed,
  JourneyRegion,
  JourneySkill,
  JourneyStop,
  MapView,
  Tone,
} from '@features/map/types'
import { partsOf } from '@features/map/utils/parts'
import type { ChapterDefinition, MissionId, MissionStatus, SkillDefinition, SkillId } from '@peerfall/game/types'
import { DONE_STATES, HERE_WORDS, PLANNED_PROGRESS, PLANNED_STOP, STATUS_WORDS, TONE_WORDS } from './journey.constants'

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
    regionId: null,
    state: 'locked',
    status: PLANNED_STOP.status,
    playable: false,
    here: false,
    summary: chapter.summary,
    skills: [],
    needs: [],
    minutes: null,
    codex: [],
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

/** "in progress · 0 of 4", as a Kernelfall region says "in progress · 0 of 4". */
export function regionProgressOf(tone: Tone, done: number, total: number): string {
  return `${TONE_WORDS[tone]} · ${done} of ${total}`
}

/** A chapter's regions with their stops; a mission the regions don't list is left out of them. */
function regionsOf(chapter: ChapterDefinition, stops: readonly JourneyStop[]): readonly JourneyRegion[] {
  return chapter.regions.map((region) => {
    const own = stops.filter((stop) => stop.regionId === region.id)
    const tone = toneOf(own)
    const done = own.filter(isDone).length
    return {
      key: `${chapter.id}/${region.id}`,
      id: region.id,
      name: region.name,
      caption: region.caption,
      guide: region.guide,
      source: region.source,
      stops: own,
      done,
      tone,
      progress: regionProgressOf(tone, done, own.length),
    }
  })
}

/**
 * The journey as the map draws it: every stage in play order with its missions as stops, grouped in
 * its regions. A stage with no missions yet is kept, as planned. `next` is where Continue goes: the
 * "You are here" stop. `skills` is the skill tree, for the skills' titles. In the Skills view a stop
 * is named by the first skill its mission earns, as Kernelfall names a level by its first skill.
 */
export function journeyChapters(
  chapters: readonly JourneyChapterSource[],
  next: { readonly id: MissionId } | null,
  skills: readonly Pick<SkillDefinition, 'id' | 'title'>[] = [],
  view: MapView = 'missions'
): readonly JourneyChapter[] {
  const entries = chapters.flatMap((entry) => entry.missions)
  const earned = new Set(
    entries.filter((entry) => entry.status === 'completed').flatMap((entry) => entry.mission.skills)
  )
  // A skill the tree doesn't list is named by its id.
  const skillOf = (id: SkillId): JourneySkill => ({ id, title: skills.find((skill) => skill.id === id)?.title ?? id })
  const needOf = (id: SkillId): JourneyNeed => ({
    ...skillOf(id),
    met: earned.has(id),
    earnedIn: entries.find((entry) => entry.mission.skills.includes(id))?.mission.title ?? null,
  })

  return chapters.map(({ chapter, missions }) => {
    const stops = missions.map(({ mission, status, attempts, hintsUsed }, index): JourneyStop => {
      const state = markStateOf(status, attempts, hintsUsed)
      const here = mission.id === next?.id
      const first = mission.skills[0]
      return {
        key: mission.id,
        planned: false,
        number: `${chapter.stage}.${index + 1}`,
        title: view === 'skills' && first !== undefined ? skillOf(first).title : mission.title,
        chapterId: chapter.id,
        stage: chapter.stage,
        regionId: chapter.regions.find((region) => region.missions.includes(mission.id))?.id ?? null,
        state,
        status: here ? `${STATUS_WORDS[state]}, ${HERE_WORDS}` : STATUS_WORDS[state],
        playable: status !== 'locked',
        here,
        summary: mission.objective,
        skills: mission.skills.map(skillOf),
        needs: mission.prerequisites.map(needOf),
        minutes: mission.minutes ?? null,
        codex: mission.codex.map((card) => ({ id: card.id, term: card.term })),
        attempts,
        hintsUsed,
        // Zero stands for "none", as on a planned stop: a mission that breaks nothing has no target.
        recoveryTargetMs: mission.recoveryTargetMs ?? 0,
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
      regions: regionsOf(chapter, stops),
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
