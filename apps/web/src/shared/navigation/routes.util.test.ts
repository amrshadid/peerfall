import type { Route } from '@shared/types/definitions/route'
import { describe, expect, it } from 'vitest'
import { hrefOf, parseRoute } from './routes.util'

describe('parseRoute', () => {
  it('reads every screen of the route table', () => {
    expect(parseRoute('')).toEqual({ name: 'title' })
    expect(parseRoute('#/')).toEqual({ name: 'title' })
    expect(parseRoute('#/map')).toEqual({ name: 'map' })
    expect(parseRoute('#/mission/the-link')).toEqual({ name: 'mission', missionId: 'the-link' })
    expect(parseRoute('#/settings')).toEqual({ name: 'settings', section: null })
    expect(parseRoute('#/settings/saves')).toEqual({ name: 'settings', section: 'saves' })
    expect(parseRoute('#/settings/keyboard')).toEqual({ name: 'settings', section: 'keyboard' })
    expect(parseRoute('#/dev/workspace')).toEqual({ name: 'dev-workspace' })
  })

  it('sends anything else to not-found', () => {
    expect(parseRoute('#/mission')).toEqual({ name: 'not-found' })
    expect(parseRoute('#/settings/sound')).toEqual({ name: 'not-found' })
    expect(parseRoute('#/nowhere')).toEqual({ name: 'not-found' })
    expect(parseRoute('#/map/a')).toEqual({ name: 'not-found' })
    expect(parseRoute('#/mission/a/b')).toEqual({ name: 'not-found' })
    expect(parseRoute('#/dev')).toEqual({ name: 'not-found' })
    expect(parseRoute('#/dev/other')).toEqual({ name: 'not-found' })
  })
})

describe('hrefOf', () => {
  it('round-trips through parseRoute', () => {
    const routes: Route[] = [
      { name: 'title' },
      { name: 'map' },
      { name: 'mission', missionId: 'the link/that never' },
      { name: 'settings', section: null },
      { name: 'settings', section: 'privacy' },
      { name: 'dev-workspace' },
    ]
    for (const route of routes) {
      expect(parseRoute(hrefOf(route))).toEqual(route)
    }
  })
})
