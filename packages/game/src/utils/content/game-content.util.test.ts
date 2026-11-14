import { describe, expect, it } from 'vitest'
import {
  EXAMPLE_MISSION,
  EXAMPLE_REGION,
  EXAMPLE_SKILLS,
  exampleChapters,
  exampleMission,
  FOLLOW_UP_MISSION,
} from '#test/index'
import type { RegionDefinition } from '#types/definitions/mission'
import { createGameContent } from '#utils/content/game-content.util'

const chapters = exampleChapters()

describe('createGameContent', () => {
  it('bundles chapters and missions in play order: by chapter, then as given', () => {
    const later = exampleMission({
      id: 'route-reflectors',
      chapter: 'scale-with-bgp',
      codex: [],
      skills: ['reflect-routes'],
    })
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
          skills: ['later-skill'],
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
    const bare = first && {
      id: first.id,
      stage: 1,
      title: first.title,
      summary: first.summary,
      outcomes: [],
      regions: [],
    }
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
        exampleMission({ prerequisites: ['bfd-timers', 'first-contact'] }),
        FOLLOW_UP_MISSION,
        FOLLOW_UP_MISSION,
        exampleMission({ id: 'lost', chapter: 'nowhere', skills: ['lost-skill'] }),
      ],
    })
    expect(content).toEqual({
      ok: false,
      errors: [
        'missions: "faster-than-default" appears more than once',
        'missions.lost.chapter: no chapter with id "nowhere"',
        'missions.the-link-that-never-went-down.prerequisites[0]: "bfd-timers" is earned in "faster-than-default", played after this mission, so it could never open',
        'missions.the-link-that-never-went-down.prerequisites[1]: no mission earns the skill "first-contact"',
        'codex: "bfd-timers" appears more than once',
      ],
    })
  })

  it('reports a skill earned by two missions', () => {
    const twice = exampleMission({ id: 'again', codex: [] })
    const content = createGameContent({ chapters, missions: [EXAMPLE_MISSION, twice] })
    expect(content).toEqual({
      ok: false,
      errors: ['missions.again.skills[0]: "bfd-fast-detection" is already earned in "the-link-that-never-went-down"'],
    })
  })

  it('checks the skill tree: unknown ids, cycles, regions, and a skill no mission earns', () => {
    const [first, ...rest] = chapters
    const grouped = first && { ...first, regions: [EXAMPLE_REGION] }
    const missions = [EXAMPLE_MISSION, FOLLOW_UP_MISSION]
    const valid = createGameContent({
      chapters: [...(grouped ? [grouped] : []), ...rest],
      missions,
      skills: EXAMPLE_SKILLS,
    })
    expect(valid.ok && valid.value.skill('bfd-timers')?.title).toBe("Tune BFD's timers")
    expect(valid.ok && valid.value.earnedIn('bfd-timers')?.id).toBe(FOLLOW_UP_MISSION.id)

    const content = createGameContent({
      chapters: [...(grouped ? [grouped] : []), ...rest],
      missions: [exampleMission({ prerequisites: ['ghost'] }), FOLLOW_UP_MISSION],
      skills: [
        { id: 'bfd-fast-detection', title: 't', region: EXAMPLE_REGION.id, prerequisites: ['bfd-timers'] },
        { id: 'bfd-timers', title: 't', region: 'elsewhere', prerequisites: ['bfd-fast-detection', 'nope'] },
        { id: 'unearned', title: 't', region: EXAMPLE_REGION.id, prerequisites: [] },
      ],
    })
    expect(content).toEqual({
      ok: false,
      errors: [
        'missions.the-link-that-never-went-down.prerequisites[0]: no mission earns the skill "ghost"',
        'skills[1].prerequisites[1]: no skill with id "nope"',
        'skills[1].region: no region with id "elsewhere"',
        'skills[2]: no mission earns "unearned"',
        'missions.the-link-that-never-went-down.prerequisites[0]: "ghost" is not a skill of skills.yaml',
        'skills: prerequisite cycle: bfd-fast-detection → bfd-timers → bfd-fast-detection',
      ],
    })
  })

  it('wants a chapter that has regions to list every one of its missions once, in play order', () => {
    const [first, ...rest] = chapters
    const region = (missions: readonly string[]): RegionDefinition => ({ ...EXAMPLE_REGION, missions })
    const build = (regions: readonly RegionDefinition[]) =>
      createGameContent({
        chapters: [...(first ? [{ ...first, regions }] : []), ...rest],
        missions: [EXAMPLE_MISSION, FOLLOW_UP_MISSION],
      })
    expect(build([region([EXAMPLE_MISSION.id, FOLLOW_UP_MISSION.id])]).ok).toBe(true)
    expect(build([region([EXAMPLE_MISSION.id, 'elsewhere'])])).toEqual({
      ok: false,
      errors: [
        'chapters[0].regions[0].missions[1]: "elsewhere" is not a mission of this chapter',
        'chapters[0].regions: the mission "faster-than-default" is in none of the chapter\'s regions',
      ],
    })
    expect(build([region([FOLLOW_UP_MISSION.id]), { ...region([EXAMPLE_MISSION.id]), id: 'second' }])).toEqual({
      ok: false,
      errors: [
        'chapters[0].regions: the regions list the missions out of play order: the-link-that-never-went-down, faster-than-default',
      ],
    })
  })
})
