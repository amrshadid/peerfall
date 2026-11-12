import type { Validated } from '@peerfall/core/types'
import type { MissionDefinition, MissionId } from '@peerfall/game/types'
import { createGameContent, validateChapters, validateMission } from '@peerfall/game/utils'
import {
  CHAPTERS_FILE,
  type ContentFiles,
  DEBRIEF_FILE,
  INCIDENT_FILE,
  type LoadedContent,
  MISSION_FILE,
  type MissionTexts,
} from '#types/definitions/content'
import { readYaml } from '#utils/loader/read-yaml.util'

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

/** Reports every problem at once, with its file and field, so broken content shows a list, not a crash. */
export function loadContent(files: ContentFiles): Validated<LoadedContent> {
  const errors: string[] = []
  const chapters = readYaml(files.chapters, CHAPTERS_FILE, validateChapters, errors)
  const missions: MissionDefinition[] = []
  const texts = new Map<MissionId, MissionTexts>()
  const folders = new Map<MissionId, string>()

  for (const path of inPlayOrder(Object.keys(files.missions))) {
    const place = MISSION_PATH.exec(path)
    if (!place) {
      errors.push(`${path}: expected <number>-<chapter>/<number>-<mission>/${MISSION_FILE}`)
      continue
    }
    const mission = readYaml(files.missions[path] ?? '', path, validateMission, errors)
    const folder = folderOf(path)
    const incident = (files.incidents[`${folder}/${INCIDENT_FILE}`] ?? '').trim()
    const debrief = (files.debriefs[`${folder}/${DEBRIEF_FILE}`] ?? '').trim()
    if (incident === '') {
      errors.push(`${folder}/${INCIDENT_FILE}: missing or empty`)
    }
    if (debrief === '') {
      errors.push(`${folder}/${DEBRIEF_FILE}: missing or empty`)
    }
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
    texts.set(mission.id, { incident, debrief })
    folders.set(mission.id, folder)
  }

  if (!chapters || errors.length > 0) {
    return { ok: false, errors }
  }
  const game = createGameContent({ chapters, missions })
  if (!game.ok) {
    return game
  }
  return {
    ok: true,
    value: {
      game: game.value,
      textsOf: (id) => texts.get(id),
      folderOf: (id) => folders.get(id),
    },
  }
}
