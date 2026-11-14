import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  CHAPTERS_FILE,
  CONCEPTS_FILE,
  type ContentFiles,
  FIELD_GUIDE_FILE,
  MISSION_FILE,
  SKILLS_FILE,
  STORY_FILE,
} from '#types/definitions/content'

/**
 * The content files read from a folder on disk, for the Node scripts: the game reads them through
 * Vite's glob, which Node does not have. Not in the barrel, so the game never bundles node:fs.
 */
export function readContentDir(dir: string): ContentFiles {
  // A file that is not there yet reads as empty, and the loader says which one is missing.
  const read = (path: string) => (existsSync(join(dir, path)) ? readFileSync(join(dir, path), 'utf8') : '')
  const missions: Record<string, string> = {}
  const stories: Record<string, string> = {}
  for (const chapter of readdirSync(dir, { withFileTypes: true }).filter((entry) => entry.isDirectory())) {
    for (const mission of readdirSync(join(dir, chapter.name), { withFileTypes: true })) {
      if (mission.isDirectory()) {
        const folder = `${chapter.name}/${mission.name}`
        missions[`${folder}/${MISSION_FILE}`] = read(`${folder}/${MISSION_FILE}`)
        stories[`${folder}/${STORY_FILE}`] = read(`${folder}/${STORY_FILE}`)
      }
    }
  }
  return {
    chapters: read(CHAPTERS_FILE),
    concepts: read(CONCEPTS_FILE),
    fieldGuide: read(FIELD_GUIDE_FILE),
    skills: read(SKILLS_FILE),
    missions,
    stories,
  }
}
