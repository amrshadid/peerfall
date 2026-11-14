import { isMissionOpen, unlockedSkills } from '@peerfall/game/utils'
import { describe, expect, it } from 'vitest'
import type { ContentFiles } from '#types/definitions/content'
import { appContent } from '#utils/loader/app-content.util'
import { CONTENT_FILES } from '#utils/loader/content-files.util'
import { loadContent } from '#utils/loader/load-content.util'

const MISSION = '4-recover-from-failure/01-the-link-that-never-went-down'
const withFiles = (change: Partial<ContentFiles>): ContentFiles => ({ ...CONTENT_FILES, ...change })

describe('the repository’s content', () => {
  it('loads with no problems', () => {
    const loaded = appContent()
    expect(loaded.ok ? [] : loaded.errors).toEqual([])
  })

  it('has the eleven chapters in play order and the first mission in chapter four', () => {
    const loaded = appContent()
    if (!loaded.ok) {
      throw new Error(loaded.errors.join('\n'))
    }
    const { game } = loaded.value
    expect(game.chapters).toHaveLength(11)
    expect(game.chapters[3]).toMatchObject({ id: 'recover-from-failure', stage: 4 })
    const mission = game.mission('the-link-that-never-went-down')
    expect(mission).toMatchObject({
      chapter: 'recover-from-failure',
      recoveryTargetMs: 2000,
      fault: { link: ['a', 'c'] },
    })
    expect(mission?.objectives.map((objective) => objective.id)).toEqual([
      'reaches-c',
      'direct-while-healthy',
      'recovers-through-b',
    ])
  })

  it('starts with the first router, each mission opened by the skills the one before it earns', () => {
    const loaded = appContent()
    if (!loaded.ok) {
      throw new Error(loaded.errors.join('\n'))
    }
    const { game } = loaded.value
    expect(game.missions[0]).toMatchObject({ id: 'the-dark-cable', chapter: 'first-router', prerequisites: [] })
    // Completing the missions one by one, in play order, opens exactly the next one each time and
    // nothing further: the order the mission-by-mission prerequisites gave before skills.
    const completed: string[] = []
    for (const mission of game.missions) {
      const unlocked = unlockedSkills(game.missions, completed)
      const open = game.missions.filter((each) => !completed.includes(each.id) && isMissionOpen(each, unlocked))
      expect([completed.length, open.map((each) => each.id)]).toEqual([completed.length, [mission.id]])
      completed.push(mission.id)
    }
    // Stage 3 is not written yet: the mission after it needs what stage 2's capstone earns, so the journey stays in order.
    expect(game.earnedIn(game.mission('the-link-that-never-went-down')?.prerequisites[0] ?? '')?.id).toBe(
      'bring-the-line-up'
    )
    // Every skill is earned by one mission, and a mission named by its first skill in the map's Skills view.
    expect(game.skills.map((skill) => game.earnedIn(skill.id)?.id)).not.toContain(undefined)
    expect(game.missions.every((mission) => game.skill(mission.skills[0] ?? '') !== undefined)).toBe(true)
    // A mission that breaks nothing has no fault to run and no recovery target.
    expect(game.missions[0]).not.toHaveProperty('fault')
    expect(game.missions[0]).not.toHaveProperty('recoveryTargetMs')
  })

  it('gives a mission its story and its folder', () => {
    const loaded = appContent()
    if (!loaded.ok) {
      throw new Error(loaded.errors.join('\n'))
    }
    const story = loaded.value.storyOf('the-link-that-never-went-down')
    expect(story?.title).toBe('The Link That Never Went Down')
    expect([...(story?.sections.keys() ?? [])]).toEqual([
      'scene',
      'see-it',
      'build-it',
      'watch-it',
      'debrief',
      'real-world',
    ])
    expect(story?.sections.get('real-world')).toContainEqual(expect.objectContaining({ kind: 'code' }))
    expect(loaded.value.folderOf('the-link-that-never-went-down')).toBe(MISSION)
  })

  it('numbers every mission by its stage and its place in it', () => {
    const loaded = appContent()
    const game = loaded.ok ? loaded.value.game : null
    expect(game?.missions.map((mission) => game.numberOf(mission.id))).toEqual([
      ...['1.1', '1.2', '1.3', '1.4', '1.5', '1.6', '1.7', '1.8'],
      ...['2.1', '2.2', '2.3', '2.4', '2.5', '2.6'],
      '4.1',
    ])
  })
})

describe('broken content', () => {
  const errorsOf = (files: ContentFiles): readonly string[] => {
    const loaded = loadContent(files)
    return loaded.ok ? [] : loaded.errors
  }

  it('names the file that is not YAML', () => {
    expect(errorsOf(withFiles({ chapters: 'chapters: [' }))[0]).toMatch(/^chapters\.yaml: not valid YAML/)
  })

  it('names the file and the field of a bad mission', () => {
    const path = `${MISSION}/mission.yaml`
    const text = (CONTENT_FILES.missions[path] ?? '').replace('recoveryTargetMs: 2000', 'recoveryTargetMs: soon')
    const errors = errorsOf(withFiles({ missions: { [path]: text } }))
    expect(errors).toHaveLength(1)
    expect(errors[0]).toMatch(new RegExp(`^${path}: recoveryTargetMs`))
  })

  it('wants a story beside every mission', () => {
    const errors = errorsOf(withFiles({ stories: {} }))
    expect(errors).toHaveLength(Object.keys(CONTENT_FILES.missions).length)
    expect(errors.at(-1)).toBe(`${MISSION}/story.md: missing or empty`)
  })

  it('names the story section a mission points at and its story lacks, and each problem’s line', () => {
    const path = `${MISSION}/story.md`
    const text = (CONTENT_FILES.stories[path] ?? '')
      .replace('## Debrief', '## Later')
      .replace('## Scene', '## Scene\n\n### Aside')
    expect(errorsOf(withFiles({ stories: { ...CONTENT_FILES.stories, [path]: text } }))).toEqual([
      `${path}:7: only "# Title" and "## Section" headings are read`,
      `${path}: no section for "story.md#debrief"`,
    ])
  })

  it('wants concepts.yaml and field-guide.yaml, and every concept a mission names in it', () => {
    expect(errorsOf(withFiles({ concepts: 'concepts: []' }))).toContain(
      'missions.the-dark-cable.teaches[0]: "router" is not a concept of concepts.yaml'
    )
    expect(errorsOf(withFiles({ fieldGuide: '' }))[0]).toMatch(/^field-guide\.yaml: /)
  })

  it('wants skills.yaml, every skill a mission names in it, and every skill earned', () => {
    expect(errorsOf(withFiles({ skills: '' }))[0]).toMatch(/^skills\.yaml: /)
    expect(errorsOf(withFiles({ skills: 'skills: []' }))).toContain(
      'missions.the-dark-cable.skills[0]: "linux-interfaces-and-routes" is not a skill of skills.yaml'
    )
    const unearned = `${CONTENT_FILES.skills}  - { id: ghost-skill, title: Nothing, region: notice-it-fast }\n`
    expect(errorsOf(withFiles({ skills: unearned }))).toEqual(['skills[16]: no mission earns "ghost-skill"'])
  })

  it('wants every stage with missions grouped in regions', () => {
    const chapters = CONTENT_FILES.chapters.replace(/ {4}regions:\n(?: {6}.*\n)+/, '')
    expect(errorsOf(withFiles({ chapters }))).toEqual([
      'chapters.yaml: chapters[0].regions: a chapter with missions groups them in regions',
    ])
  })

  it('wants the folder to be named after the chapter and the mission', () => {
    const path = `${MISSION}/mission.yaml`
    const moved = '3-build-an-underlay/02-something-else/mission.yaml'
    const errors = errorsOf(
      withFiles({
        missions: { [moved]: CONTENT_FILES.missions[path] ?? '' },
        stories: {
          '3-build-an-underlay/02-something-else/story.md': CONTENT_FILES.stories[`${MISSION}/story.md`] ?? '',
        },
      })
    )
    expect(errors).toEqual([
      `${moved}: chapter is "recover-from-failure", but the folder is in "build-an-underlay"`,
      `${moved}: id is "the-link-that-never-went-down", but the folder is named "something-else"`,
    ])
  })

  it('refuses a mission file outside a chapter folder', () => {
    expect(errorsOf(withFiles({ missions: { 'loose/mission.yaml': 'id: x' } }))[0]).toBe(
      'loose/mission.yaml: expected <number>-<chapter>/<number>-<mission>/mission.yaml'
    )
  })
})
