import { appContent } from '@peerfall/missions/utils'
import { describe, expect, it } from 'vitest'
import { documentTitleOf, screenTitleOf } from './document-title.util'

const loaded = appContent()
if (!loaded.ok) {
  throw new Error(loaded.errors.join('\n'))
}
const content = loaded.value

describe('documentTitleOf', () => {
  it.each([
    [{ name: 'title' } as const, 'Peerfall: learn FRRouting on a real network'],
    [{ name: 'map' } as const, 'Peer Map · Peerfall'],
    [
      { name: 'mission', missionId: 'the-link-that-never-went-down' } as const,
      'The Link That Never Went Down · Peerfall',
    ],
    [{ name: 'mission', missionId: 'nope' } as const, 'Mission · Peerfall'],
    [{ name: 'settings', section: null } as const, 'Settings · Peerfall'],
    [{ name: 'dev-workspace' } as const, 'Workspace fixtures · Peerfall'],
    [{ name: 'not-found' } as const, 'Page not found · Peerfall'],
  ])('titles %o as %s', (route, title) => {
    expect(documentTitleOf(route, content)).toBe(title)
  })
})

describe('screenTitleOf', () => {
  it('names the screen that replaces the route when content fails or the window is narrow', () => {
    const map = { name: 'map' } as const
    expect(screenTitleOf(map, null, true)).toBe('Content errors · Peerfall')
    expect(screenTitleOf(map, content, false)).toBe('Peerfall: learn FRRouting on a real network')
    expect(screenTitleOf(map, content, true)).toBe('Peer Map · Peerfall')
  })
})
