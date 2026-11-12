import type { Notice } from '@features/notices/types'
import { MAX_NOTICES } from './notices.constants'

/** `at` keeps two passes of the same mission apart. */
export function missionPassedNotice(missionId: string, title: string, at: number): Notice {
  return { id: `complete-${missionId}-${at}`, kind: 'complete', kicker: 'Mission passed', text: title, sticky: false }
}

export function saveFailedNotice(at: number): Notice {
  return {
    id: `save-failed-${at}`,
    kind: 'save-failed',
    kicker: 'Not saved',
    text: 'Progress is kept in this tab only.',
    sticky: true,
  }
}

/** Oldest first; a save failure waits until nothing else is queued. */
export function shownNotice(notices: readonly Notice[]): Notice | undefined {
  return notices.find((notice) => !notice.sticky) ?? notices[0]
}

/** Replaces an earlier save failure. Beyond MAX_NOTICES the oldest plain note gives way first. */
export function pushNotice(notices: readonly Notice[], notice: Notice): readonly Notice[] {
  const next = [
    ...notices.filter((existing) => notice.kind !== 'save-failed' || existing.kind !== 'save-failed'),
    notice,
  ]
  while (next.length > MAX_NOTICES) {
    const info = next.findIndex((existing) => existing.kind === 'info')
    next.splice(info === -1 ? 0 : info, 1)
  }
  return next
}
