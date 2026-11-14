import type { Validated } from '@peerfall/core/types'
import type { MissionDefinition, MissionId } from '@peerfall/game/types'
import {
  createGameContent,
  validateChapters,
  validateConcepts,
  validateFieldGuide,
  validateMission,
  validateSkills,
} from '@peerfall/game/utils'
import {
  CHAPTERS_FILE,
  CONCEPTS_FILE,
  type ContentFiles,
  FIELD_GUIDE_FILE,
  type LoadedContent,
  MISSION_FILE,
  SKILLS_FILE,
  STORY_FILE,
} from '#types/definitions/content'
import type { Story } from '#types/definitions/story'
import { readYaml } from '#utils/loader/read-yaml.util'
import { parseStory, sectionOf, storyProblems } from '#utils/story/index'

// `4-recover-from-failure/01-the-link-that-never-went-down`: numbered in play order, with the
// ids the YAML carries after the number. The ids never change when folders are renumbered.
const MISSION_PATH = /^(\d+)-([a-z0-9-]+)\/(\d+)-([a-z0-9-]+)\/mission\.yaml$/

const folderOf = (path: string): string => path.slice(0, path.lastIndexOf('/'))

/** Play order: by chapter number, then by mission number, as numbers (10 comes after 9). */
function inPlayOrder(paths: readonly string[]): string[] {
  const numbers = (path: string) => {
    const match = MISSION_PATH.exec(path)
    return [Number(match?.[1] ?? 0), Number(match?.[3] ?? 0)] as const
  }
  return [...paths].sort((first, second) => {
    const [firstChapter, firstMission] = numbers(first)
    const [secondChapter, secondMission] = numbers(second)
    return firstChapter - secondChapter || firstMission - secondMission
  })
}

/** The story beside a mission, with every problem it has and every section the mission points at but it lacks. */
function readStory(text: string, path: string, mission: MissionDefinition | null, errors: string[]): Story | null {
  if (text.trim() === '') {
    errors.push(`${path}: missing or empty`)
    return null
  }
  const problems = storyProblems(text)
  errors.push(...problems.map((problem) => `${path}:${problem.line}: ${problem.message}`))
  const story = parseStory(text)
  for (const ref of Object.values(mission?.story ?? {})) {
    if (!story.sections.has(sectionOf(ref))) {
      errors.push(`${path}: no section for "${ref}"`)
    }
  }
  if (mission && story.title !== '' && story.title !== mission.title) {
    errors.push(`${path}:1: the title is "${story.title}", but mission.yaml calls it "${mission.title}"`)
  }
  return problems.length === 0 ? story : null
}

/** Reports every problem at once, with its file and field, so broken content shows a list, not a crash. */
export function loadContent(files: ContentFiles): Validated<LoadedContent> {
  const errors: string[] = []
  const chapters = readYaml(files.chapters, CHAPTERS_FILE, validateChapters, errors)
  const concepts = readYaml(files.concepts, CONCEPTS_FILE, validateConcepts, errors)
  const fieldGuide = readYaml(files.fieldGuide, FIELD_GUIDE_FILE, validateFieldGuide, errors)
  const skills = readYaml(files.skills, SKILLS_FILE, validateSkills, errors)
  const missions: MissionDefinition[] = []
  const stories = new Map<MissionId, Story>()
  const folders = new Map<MissionId, string>()

  for (const path of inPlayOrder(Object.keys(files.missions))) {
    const place = MISSION_PATH.exec(path)
    if (!place) {
      errors.push(`${path}: expected <number>-<chapter>/<number>-<mission>/${MISSION_FILE}`)
      continue
    }
    const mission = readYaml(files.missions[path] ?? '', path, validateMission, errors)
    const folder = folderOf(path)
    const storyPath = `${folder}/${STORY_FILE}`
    const story = readStory(files.stories[storyPath] ?? '', storyPath, mission, errors)
    if (!mission) {
      continue
    }
    // A folder is found by reading its name, so the name has to say what is inside.
    if (mission.chapter !== place[2]) {
      errors.push(`${path}: chapter is "${mission.chapter}", but the folder is in "${place[2]}"`)
    }
    if (mission.id !== place[4]) {
      errors.push(`${path}: id is "${mission.id}", but the folder is named "${place[4]}"`)
    }
    missions.push(mission)
    if (story) {
      stories.set(mission.id, story)
    }
    folders.set(mission.id, folder)
  }

  // The map draws a stage's missions under its regions' headings, so the game's content groups them all.
  chapters?.forEach((chapter, at) => {
    if (chapter.regions.length === 0 && missions.some((mission) => mission.chapter === chapter.id)) {
      errors.push(`${CHAPTERS_FILE}: chapters[${at}].regions: a chapter with missions groups them in regions`)
    }
  })
  if (!chapters || !concepts || !fieldGuide || !skills || errors.length > 0) {
    return { ok: false, errors }
  }
  const game = createGameContent({ chapters, missions, concepts, fieldGuide, skills })
  if (!game.ok) {
    return game
  }
  return {
    ok: true,
    value: {
      game: game.value,
      storyOf: (id) => stories.get(id),
      folderOf: (id) => folders.get(id),
    },
  }
}
