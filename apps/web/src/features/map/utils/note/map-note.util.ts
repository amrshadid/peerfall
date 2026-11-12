import type { JourneyChapter, JourneyStop, MapNote, MapNotes, MapNoteTarget, SceneChapter } from '@features/map/types'
import { listOf, recoveryOf } from '@features/map/utils/detail'
import { partsLine } from '@features/map/utils/parts'
import type { ChapterId } from '@peerfall/game/types'
import { NOTE_STATES, PLANNED_NOTE } from './map-note.constants'

/** "Next up", "Completed", "Locked: finish The Link That Never Went Down first". */
export function stopStateOf(stop: JourneyStop): string {
  switch (stop.state) {
    case 'locked': {
      if (stop.planned) {
        return NOTE_STATES.planned
      }
      const blockers = stop.needs.filter((need) => !need.met).map((need) => need.title)
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

export function stopNoteOf(stop: JourneyStop, chapter: Pick<JourneyChapter, 'name' | 'parts'>): MapNote {
  return {
    // A planned stop stands for its stage, so its note is headed by the stage's name.
    title: stop.planned ? `Stage ${stop.number} · ${chapter.name}` : `${stop.number} · ${stop.title}`,
    text: stop.planned ? `${stop.summary} ${PLANNED_NOTE}` : stop.summary,
    facts: [stopStateOf(stop), recoveryOf(stop), partsLine(chapter.parts)].filter((fact) => fact !== null),
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
  return {
    stops: new Map(
      chapters.flatMap((chapter) => chapter.marks.map((stop) => [stop.key, stopNoteOf(stop, chapter)] as const))
    ),
    chapters: new Map(chapters.map((chapter) => [chapter.id, chapterNoteOf(chapter)] as const)),
  }
}

/** The note for the target, else for the stage in view. */
export function noteOf(target: MapNoteTarget | null, notes: MapNotes, inView: ChapterId | null): MapNote | undefined {
  const found =
    target?.kind === 'stop'
      ? notes.stops.get(target.key)
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
  return b.kind === 'stop' && a.key === b.key
}

/** The stage at drawing height `y`; stops answer for themselves. */
export function targetAt(chapters: readonly SceneChapter[], y: number): MapNoteTarget | null {
  const chapter = chapters.find((candidate) => y >= candidate.top && y < candidate.bottom)
  return chapter ? { kind: 'chapter', id: chapter.id } : null
}
