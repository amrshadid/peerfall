import { describe, expect, it } from 'vitest'
import { EXAMPLE_MISSION, exampleChapters, exampleMission, FOLLOW_UP_MISSION } from '#test/index'
import { createGameContent } from '#utils/content/game-content.util'

const chapters = exampleChapters()

describe('createGameContent', () => {
  it('bundles chapters and missions in play order: by chapter, then as given', () => {
    const later = exampleMission({ id: 'route-reflectors', chapter: 'scale-with-bgp' })
    const content = createGameContent({ chapters, missions: [later, EXAMPLE_MISSION, FOLLOW_UP_MISSION] })
    expect(content.ok && content.value.missions.map((mission) => mission.id)).toEqual([
      EXAMPLE_MISSION.id,
      FOLLOW_UP_MISSION.id,
      'route-reflectors',
    ])
    expect(content.ok && content.value.mission(FOLLOW_UP_MISSION.id)).toBe(FOLLOW_UP_MISSION)
    expect(content.ok && content.value.mission('nope')).toBeUndefined()
    expect(content.ok && content.value.missionsIn('scale-with-bgp')).toEqual([later])
    expect(content.ok && content.value.chapters).toBe(chapters)
  })

  it('accepts a curriculum with no missions yet', () => {
    expect(createGameContent({ chapters, missions: [] })).toMatchObject({ ok: true, value: { missions: [] } })
  })

  it('reports ids used twice, unknown chapters and prerequisites that could never be met', () => {
    const content = createGameContent({
      chapters,
      missions: [
        exampleMission({ prerequisites: [FOLLOW_UP_MISSION.id, 'first-contact'] }),
        FOLLOW_UP_MISSION,
        FOLLOW_UP_MISSION,
        exampleMission({ id: 'lost', chapter: 'nowhere' }),
      ],
    })
    expect(content).toEqual({
      ok: false,
      errors: [
        'missions: "faster-than-default" appears more than once',
        'missions.lost.chapter: no chapter with id "nowhere"',
        'missions.the-link-that-never-went-down.prerequisites[0]: "faster-than-default" is played after this mission, so it could never be unlocked',
        'missions.the-link-that-never-went-down.prerequisites[1]: no mission with id "first-contact"',
      ],
    })
  })
})
