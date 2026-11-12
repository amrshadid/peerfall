import type { JourneyChapter, JourneyStop, MapDetail } from '@features/map/types'
import { isDone } from '@features/map/utils/journey'
import { hrefOf } from '@shared/navigation'
import { ABOUT_TERMS, MS_PER_SECOND, PLAN_NOTES } from './map-detail.constants'

/** "a", "a and b", "a, b and c". */
export function listOf(words: readonly string[]): string {
  return words.length < 2 ? (words[0] ?? '') : `${words.slice(0, -1).join(', ')} and ${words[words.length - 1]}`
}

/** The stop's action: back into a mission under way, a replay of a completed one, else a first play. */
export function playLabelOf(stop: Pick<JourneyStop, 'state'>): string {
  if (stop.state === 'progress') {
    return 'Continue'
  }
  return isDone(stop) ? 'Replay' : 'Play'
}

/** Why the stop can't be played yet, naming what to complete first; null when it can. */
export function lockNoteOf(stop: Pick<JourneyStop, 'playable' | 'needs' | 'planned'>): string | null {
  if (stop.planned) {
    return PLAN_NOTES.planned
  }
  if (stop.playable) {
    return null
  }
  const missing = stop.needs.filter((need) => !need.met).map((need) => need.title)
  return missing.length === 0 ? PLAN_NOTES.locked : `Locked: complete ${listOf(missing)} first.`
}

/** "2 s", "500 ms", "1.5 s". */
export function formatTarget(ms: number): string {
  if (ms < MS_PER_SECOND) {
    return `${ms} ms`
  }
  const seconds = ms / MS_PER_SECOND
  return `${Number.isInteger(seconds) ? seconds : seconds.toFixed(1)} s`
}

/** "Traffic back within 2 s"; null for a mission that sets no target. */
export function recoveryOf(stop: Pick<JourneyStop, 'recoveryTargetMs'>): string | null {
  return stop.recoveryTargetMs > 0 ? `Traffic back within ${formatTarget(stop.recoveryTargetMs)}` : null
}

function countOf(count: number, none: string, one: string, many: string): string {
  if (count === 0) {
    return none
  }
  return `${count} ${count === 1 ? one : many}`
}

export function mapDetailOf(stop: JourneyStop, chapters: readonly JourneyChapter[]): MapDetail {
  const chapter = chapters.find((candidate) => candidate.id === stop.chapterId)
  const status = stop.status.charAt(0).toUpperCase() + stop.status.slice(1)
  const parts = chapter?.parts ?? []
  if (stop.planned) {
    // The stop stands for the whole stage, so the panel is headed by the stage's name.
    return {
      place: `Stage ${stop.stage} of ${chapters.length}`,
      title: chapter?.name ?? stop.title,
      state: stop.state,
      planned: true,
      status,
      about: { term: ABOUT_TERMS.planned, text: stop.summary },
      parts,
      needs: null,
      attempts: null,
      hints: null,
      recovery: null,
      play: null,
      note: lockNoteOf(stop),
    }
  }
  return {
    place: [`Stage ${stop.stage}`, chapter?.name, stop.number].filter((part) => part !== undefined).join(' · '),
    title: stop.title,
    state: stop.state,
    planned: false,
    status,
    about: { term: ABOUT_TERMS.mission, text: stop.summary },
    parts,
    needs: stop.needs,
    attempts: countOf(stop.attempts, 'None yet', 'judged run', 'judged runs'),
    hints: countOf(stop.hintsUsed, 'None', 'hint', 'hints'),
    recovery: recoveryOf(stop),
    play: stop.playable ? { label: playLabelOf(stop), href: hrefOf({ name: 'mission', missionId: stop.key }) } : null,
    note: lockNoteOf(stop),
  }
}
