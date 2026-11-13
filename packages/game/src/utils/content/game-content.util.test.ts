import { describe, expect, it } from 'vitest'
import { EXAMPLE_MISSION, exampleChapters, exampleMission, FOLLOW_UP_MISSION } from '#test/index'
import { createGameContent } from '#utils/content/game-content.util'

const chapters = exampleChapters()

describe('createGameContent', () => {
  it('bundles chapters and missions in play order: by chapter, then as given', () => {
    const later = exampleMission({ id: 'route-reflectors', chapter: 'scale-with-bgp', codex: [] })
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
    expect(
      content.ok && [EXAMPLE_MISSION.id, FOLLOW_UP_MISSION.id, 'route-reflectors'].map(content.value.numberOf)
    ).toEqual(['1.1', '1.2', '2.1'])
    expect(content.ok && content.value.card('bfd-timers')?.missionId).toBe(FOLLOW_UP_MISSION.id)
  })

  it('checks concepts, cards and the Field Guide against the missions', () => {
    const content = createGameContent({
      chapters,
      missions: [
        EXAMPLE_MISSION,
        exampleMission({
          id: 'later',
          teaches: ['bfd-session'],
          names: [],
          uses: ['nowhere'],
          codex: [{ id: 'echo', term: 'echo mode', simple: 's', sources: [], deepens: 'unwritten' }],
        }),
      ],
      concepts: [
        { id: 'bfd-session', term: 'BFD session', part: 'bfd', codex: 'bfd' },
        { id: 'ospf-adjacency', term: 'adjacency', part: 'ospf' },
        { id: 'bfd-timers', term: 'BFD timers', part: 'bfd', codex: 'gone' },
      ],
      fieldGuide: {
        entries: [{ name: 'show bfd peers', kind: 'vtysh', what: 'w', firstMet: 'nope', deepenedIn: ['later', 'x'] }],
      },
    })
    expect(content).toEqual({
      ok: false,
      errors: [
        'missions.later.codex[0].deepens: no card "unwritten" earlier in play order to deepen',
        'missions.later.uses[0]: "nowhere" is not a concept of concepts.yaml',
        'concepts[2].codex: no mission adds a card "gone"',
        'fieldGuide.entries[0].firstMet: no mission with id "nope"',
        'fieldGuide.entries[0].deepenedIn[1]: no mission with id "x"',
      ],
    })
  })

  it('wants a title page and an ending for every chapter that has missions', () => {
    const [first, ...rest] = chapters
    const bare = first && { id: first.id, stage: 1, title: first.title, summary: first.summary, outcomes: [] }
    const content = createGameContent({ chapters: [...(bare ? [bare] : []), ...rest], missions: [EXAMPLE_MISSION] })
    expect(content).toEqual({
      ok: false,
      errors: [
        'chapters[0].story: a chapter with missions needs it for its page in the Codex',
        'chapters[0].guide: a chapter with missions needs it for its page in the Codex',
        'chapters[0].standsFor: a chapter with missions needs it for its page in the Codex',
        'chapters[0].outcomes: a chapter with missions says what the player can do after it',
      ],
    })
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
        'codex: "bfd-timers" appears more than once',
      ],
    })
  })
})
