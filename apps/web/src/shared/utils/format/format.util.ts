import { MINUTES_PER_HOUR, MS_PER_DAY, MS_PER_HOUR, MS_PER_MINUTE } from './format.constants'

/** "just now", "5 minutes ago", "2 days ago", for "last played". */
export function formatLastPlayed(now: number, at: number): string {
  const elapsed = Math.max(0, now - at)
  const format = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
  if (elapsed < MS_PER_MINUTE) {
    return 'just now'
  }
  if (elapsed < MS_PER_HOUR) {
    return format.format(-Math.floor(elapsed / MS_PER_MINUTE), 'minute')
  }
  if (elapsed < MS_PER_DAY) {
    return format.format(-Math.floor(elapsed / MS_PER_HOUR), 'hour')
  }
  return format.format(-Math.floor(elapsed / MS_PER_DAY), 'day')
}

const PERCENT = new Intl.NumberFormat('en', { style: 'percent', maximumFractionDigits: 1 })

/** A ratio as a percentage, to one decimal where it needs one: 0.875 reads "87.5%". */
export function formatPercent(ratio: number): string {
  return PERCENT.format(ratio)
}

/** "1 h 40 min", "12 min", for time played. */
export function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / MS_PER_MINUTE)
  const hours = Math.floor(minutes / MINUTES_PER_HOUR)
  return hours > 0 ? `${hours} h ${minutes % MINUTES_PER_HOUR} min` : `${minutes} min`
}
