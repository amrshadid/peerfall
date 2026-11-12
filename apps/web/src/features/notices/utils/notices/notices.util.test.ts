import type { Notice } from '@features/notices/types'
import { describe, expect, it } from 'vitest'
import { MAX_NOTICES } from './notices.constants'
import { missionPassedNotice, pushNotice, saveFailedNotice, shownNotice } from './notices.util'

const info = (id: string): Notice => ({ id, kind: 'info', kicker: 'Note', text: id, sticky: false })

describe('notices', () => {
  it('stamps a passed mission with its title, and tells two passes apart', () => {
    const first = missionPassedNotice('link', 'The Link That Never Went Down', 1)
    expect(first).toMatchObject({ kind: 'complete', kicker: 'Mission passed', sticky: false })
    expect(first.text).toBe('The Link That Never Went Down')
    expect(missionPassedNotice('link', 'x', 2).id).not.toBe(first.id)
  })

  it('keeps a failed save on show until it is dismissed', () => {
    expect(saveFailedNotice(5)).toMatchObject({ kind: 'save-failed', sticky: true })
  })
})

describe('shownNotice', () => {
  it('shows the oldest first, and a save failure only once nothing else waits', () => {
    const failed = saveFailedNotice(1)
    expect(shownNotice([failed, info('a'), info('b')])?.id).toBe('a')
    expect(shownNotice([failed])?.id).toBe(failed.id)
    expect(shownNotice([])).toBeUndefined()
  })
})

describe('pushNotice', () => {
  it('replaces an earlier save failure instead of stacking them', () => {
    const queue = pushNotice(pushNotice([], saveFailedNotice(1)), saveFailedNotice(2))
    expect(queue.map((notice) => notice.id)).toEqual(['save-failed-2'])
  })

  it('lets the oldest plain note give way first when the queue is full', () => {
    const passed = missionPassedNotice('link', 'x', 1)
    let queue: readonly Notice[] = [passed]
    for (const id of ['a', 'b', 'c']) {
      queue = pushNotice(queue, info(id))
    }
    expect(queue).toHaveLength(MAX_NOTICES)
    expect(queue.map((notice) => notice.id)).toEqual([passed.id, 'b', 'c'])
  })
})
