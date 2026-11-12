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

  it('starts with the first router, each mission unlocked by the one before it', () => {
    const loaded = appContent()
    if (!loaded.ok) {
      throw new Error(loaded.errors.join('\n'))
    }
    const { game } = loaded.value
    expect(game.missions[0]).toMatchObject({ id: 'the-silent-router', chapter: 'first-router', prerequisites: [] })
    expect(game.missionsIn('first-router').map((mission) => [mission.id, mission.prerequisites])).toEqual([
      ['the-silent-router', []],
      ['gone-after-the-restart', ['the-silent-router']],
    ])
    expect(game.missionsIn('follow-a-packet').map((mission) => [mission.id, mission.prerequisites])).toEqual([
      ['two-ends-of-one-cable', ['gone-after-the-restart']],
      ['the-reply-that-never-came-back', ['two-ends-of-one-cable']],
    ])
    // A mission that breaks nothing has no fault to run and no recovery target.
    expect(game.missions[0]).not.toHaveProperty('fault')
    expect(game.missions[0]).not.toHaveProperty('recoveryTargetMs')
  })

  it('gives a mission its incident, its debrief and its folder', () => {
    const loaded = appContent()
    if (!loaded.ok) {
      throw new Error(loaded.errors.join('\n'))
    }
    const texts = loaded.value.textsOf('the-link-that-never-went-down')
    expect(texts?.incident).toContain('# Incident')
    expect(texts?.debrief).toContain('ip ospf bfd')
    expect(loaded.value.folderOf('the-link-that-never-went-down')).toBe(MISSION)
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

  it('wants an incident and a debrief beside every mission', () => {
    const errors = errorsOf(withFiles({ incidents: {}, debriefs: {} }))
    expect(errors).toHaveLength(2 * Object.keys(CONTENT_FILES.missions).length)
    expect(errors.slice(-2)).toEqual([
      `${MISSION}/incident.md: missing or empty`,
      `${MISSION}/debrief.md: missing or empty`,
    ])
  })

  it('wants the folder to be named after the chapter and the mission', () => {
    const path = `${MISSION}/mission.yaml`
    const moved = '3-build-an-underlay/02-something-else/mission.yaml'
    const errors = errorsOf(
      withFiles({
        missions: { [moved]: CONTENT_FILES.missions[path] ?? '' },
        incidents: { '3-build-an-underlay/02-something-else/incident.md': 'text' },
        debriefs: { '3-build-an-underlay/02-something-else/debrief.md': 'text' },
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
