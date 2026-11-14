import type {
  JourneyChapter,
  JourneyRegion,
  JourneyStop,
  MapNote,
  MapNotes,
  MapNoteTarget,
  SceneChapter,
} from '@features/map/types'
import { listOf, missionTimeOf, recoveryOf } from '@features/map/utils/detail'
import { isDone } from '@features/map/utils/journey'
import { partsLine } from '@features/map/utils/parts'
import type { ChapterId } from '@peerfall/game/types'
import { NOTE_STATES, PLANNED_NOTE } from './map-note.constants'

/** The missions that earn the skills a locked mission still needs, in the order it needs them. */
export function blockersOf(stop: Pick<JourneyStop, 'needs'>): readonly string[] {
  return [...new Set(stop.needs.filter((need) => !need.met).map((need) => need.earnedIn ?? need.title))]
}

/** "Next up", "Completed", "Locked: finish The Link That Never Went Down first". */
export function stopStateOf(stop: JourneyStop): string {
  switch (stop.state) {
    case 'locked': {
      if (stop.planned) {
        return NOTE_STATES.planned
      }
      const blockers = blockersOf(stop)
      return blockers.length === 0 ? NOTE_STATES.lockedUnknown : `Locked: finish ${listOf(blockers)} first`
    }
    case 'available':
      return stop.here ? NOTE_STATES.next : NOTE_STATES.available
    case 'progress':
      return NOTE_STATES.progress
    case 'helped':
      return NOTE_STATES.helped
    case 'clean':
      return NOTE_STATES.clean
    case 'done':
      return NOTE_STATES.done
  }
}

export function stopNoteOf(
  stop: JourneyStop,
  chapter: Pick<JourneyChapter, 'name' | 'parts'>,
  region: Pick<JourneyRegion, 'guide'> | null
): MapNote {
  if (stop.planned) {
    // A planned stop stands for its stage, so its note is headed by the stage's name.
    return {
      title: `Stage ${stop.number} · ${chapter.name}`,
      text: `${stop.summary} ${PLANNED_NOTE}`,
      facts: [stopStateOf(stop), partsLine(chapter.parts)].filter((fact) => fact !== null),
    }
  }
  return {
    title: `${stop.number} · ${stop.title}`,
    text: stop.summary,
    facts: [stopStateOf(stop), missionTimeOf(stop), recoveryOf(stop), region ? `Guide: ${region.guide}` : null].filter(
      (fact) => fact !== null
    ),
  }
}

export function regionNoteOf(region: JourneyRegion): MapNote {
  return {
    title: region.name,
    text: `The part of FRR it stands for: ${region.caption}. In FRR's source: ${region.source}.`,
    facts: [`Guide: ${region.guide}`, `${region.stops.filter(isDone).length} of ${region.stops.length} passed`],
  }
}

export function chapterNoteOf(chapter: JourneyChapter): MapNote {
  return {
    title: `What this stage covers · ${chapter.name}`,
    text: chapter.planned ? `${chapter.caption} ${PLANNED_NOTE}` : chapter.caption,
    facts: [chapter.kicker, chapter.progress, partsLine(chapter.parts)].filter((fact) => fact !== null),
  }
}

export function mapNotesOf(chapters: readonly JourneyChapter[]): MapNotes {
  const regions = chapters.flatMap((chapter) => chapter.regions)
  return {
    stops: new Map(
      chapters.flatMap((chapter) =>
        chapter.marks.map((stop) => {
          const region = chapter.regions.find((candidate) => candidate.id === stop.regionId) ?? null
          return [stop.key, stopNoteOf(stop, chapter, region)] as const
        })
      )
    ),
    regions: new Map(regions.map((region) => [region.key, regionNoteOf(region)] as const)),
    chapters: new Map(chapters.map((chapter) => [chapter.id, chapterNoteOf(chapter)] as const)),
  }
}

/** The note for the target, else for the stage in view. */
export function noteOf(target: MapNoteTarget | null, notes: MapNotes, inView: ChapterId | null): MapNote | undefined {
  const found =
    target?.kind === 'stop'
      ? notes.stops.get(target.key)
      : target?.kind === 'region'
        ? notes.regions.get(target.key)
        : target?.kind === 'chapter'
          ? notes.chapters.get(target.id)
          : undefined
  return found ?? (inView ? notes.chapters.get(inView) : undefined)
}

export function sameTarget(a: MapNoteTarget | null, b: MapNoteTarget | null): boolean {
  if (a === null || b === null) {
    return a === b
  }
  if (a.kind === 'chapter') {
    return b.kind === 'chapter' && a.id === b.id
  }
  return b.kind === a.kind && 'key' in b && a.key === b.key
}

/** The region band or stage at drawing height `y`; stops answer for themselves. */
export function targetAt(chapters: readonly SceneChapter[], y: number): MapNoteTarget | null {
  const chapter = chapters.find((candidate) => y >= candidate.top && y < candidate.bottom)
  if (!chapter) {
    return null
  }
  const region = chapter.regions.find((candidate) => y >= candidate.top && y < candidate.bottom)
  return region ? { kind: 'region', key: region.key } : { kind: 'chapter', id: chapter.id }
}
