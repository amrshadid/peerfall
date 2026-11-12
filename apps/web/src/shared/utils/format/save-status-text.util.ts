import type { SaveState } from '@shared/types'
import { MINUTES_PER_HOUR, MS_PER_MINUTE } from './format.constants'

// Below this many minutes a save is "a few minutes ago"; from here to the hour, "half an hour ago".
const FEW_MINUTES = 30

/** Coarse on purpose: a count of seconds reads like a timer, and the game has none. */
export function formatAgo(ms: number): string {
  const minutes = Math.max(0, Math.floor(ms / MS_PER_MINUTE))
  if (minutes < 1) {
    return 'just now'
  }
  if (minutes < 2) {
    return 'a minute ago'
  }
  if (minutes < FEW_MINUTES) {
    return 'a few minutes ago'
  }
  if (minutes < MINUTES_PER_HOUR) {
    return 'half an hour ago'
  }
  const hours = Math.floor(minutes / MINUTES_PER_HOUR)
  return hours < 2 ? 'an hour ago' : `${hours} hours ago`
}

/** The status bar's save line: "Saved a minute ago", "Saving…", or why nothing is being kept. */
export function saveStatusText(state: SaveState, savedAgoMs: number | null): string {
  switch (state) {
    case 'saving':
      return 'Saving…'
    case 'memory':
      return 'Not saved: storage is off in this window'
    case 'failed':
      return 'Not saved: storage is full'
    case 'saved':
      return savedAgoMs === null ? 'Saved' : `Saved ${formatAgo(savedAgoMs)}`
  }
}
