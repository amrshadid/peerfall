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

  it('opens a Codex card over a mission, and the Codex at a card, a chapter or a page', () => {
    expect(parseRoute('#/mission/m?card=vtysh')).toEqual({ name: 'mission', missionId: 'm', card: 'vtysh' })
    expect(parseRoute('#/codex')).toEqual({ name: 'codex', cardId: null })
    expect(parseRoute('#/codex/the-rib')).toEqual({ name: 'codex', cardId: 'the-rib' })
    expect(parseRoute('#/codex/chapter/first-router')).toEqual({ name: 'codex', cardId: null, chapter: 'first-router' })
    expect(parseRoute('#/codex/field-guide')).toEqual({ name: 'codex', cardId: null, page: 'field-guide' })
    expect(parseRoute('#/codex/glossary')).toEqual({ name: 'codex', cardId: null, page: 'glossary' })
    expect(parseRoute('#/codex/chapter')).toEqual({ name: 'not-found' })
    expect(parseRoute('#/codex/a/b')).toEqual({ name: 'not-found' })
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
      { name: 'mission', missionId: 'm', card: 'show ip route' },
      { name: 'codex', cardId: null },
      { name: 'codex', cardId: 'the rib' },
      { name: 'codex', cardId: null, chapter: 'first-router' },
      { name: 'codex', cardId: null, page: 'field-guide' },
      { name: 'settings', section: null },
      { name: 'settings', section: 'privacy' },
      { name: 'dev-workspace' },
    ]
    for (const route of routes) {
      expect(parseRoute(hrefOf(route))).toEqual(route)
    }
  })
})
