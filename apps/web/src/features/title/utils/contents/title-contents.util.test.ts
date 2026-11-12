import { hrefOf } from '@shared/navigation'
import { describe, expect, it } from 'vitest'
import { FIRST_MISSION, JOURNEY } from './title-contents.constants'
import { titleContentsOf, titleStartOf } from './title-contents.util'

describe('titleContentsOf', () => {
  it('lists the eleven stages in play order, then Settings', () => {
    const contents = titleContentsOf({ journey: JOURNEY, devRoutes: false })
    expect(contents).toHaveLength(12)
    expect(contents[0]).toMatchObject({ id: 'stage-1', name: '1 · First router' })
    expect(contents[10]).toMatchObject({ id: 'stage-11', name: '11 · Operate a network' })
    expect(contents.at(-1)).toMatchObject({ id: 'settings', href: hrefOf({ name: 'settings', section: null }) })
  })

  it('links only the stage that has a mission: the rest are listed, with nothing to press', () => {
    const contents = titleContentsOf({ journey: JOURNEY, devRoutes: false })
    const linked = contents.filter((entry) => entry.id.startsWith('stage-') && entry.href !== undefined)
    expect(linked.map((entry) => entry.id)).toEqual(['stage-4'])
    expect(linked[0]?.href).toBe(hrefOf({ name: 'mission', missionId: FIRST_MISSION.id }))
    expect(contents.some((entry) => entry.onSelect !== undefined)).toBe(false)
  })

  it('adds the workspace fixtures on a dev server only', () => {
    const ids = (devRoutes: boolean) => titleContentsOf({ journey: JOURNEY, devRoutes }).map((entry) => entry.id)
    expect(ids(false)).not.toContain('dev-workspace')
    expect(ids(true).at(-1)).toBe('dev-workspace')
  })
})

describe('titleStartOf', () => {
  it('starts at the first mission and says which stage it belongs to', () => {
    const start = titleStartOf()
    expect(start.href).toBe(hrefOf({ name: 'mission', missionId: FIRST_MISSION.id }))
    expect(start.where).toBe('Stage 4 · Recover from failure · The Link That Never Went Down')
  })

  it('still names the mission when its stage is not listed', () => {
    expect(titleStartOf([]).where).toBe('The Link That Never Went Down')
  })
})
