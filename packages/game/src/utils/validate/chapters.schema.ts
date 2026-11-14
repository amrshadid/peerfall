import type { Validated } from '@peerfall/core/types'
import { Issues, ObjectReader, reportDuplicates } from '@peerfall/core/utils'
import { type ChapterDefinition, KEBAB_ID, type RegionDefinition } from '#types/definitions/mission'

const CHAPTER_KEYS = ['id', 'title', 'summary', 'story', 'guide', 'standsFor', 'outcomes', 'regions'] as const

const REGION_KEYS = ['id', 'name', 'caption', 'guide', 'source', 'missions'] as const

function readRegion(region: ObjectReader): RegionDefinition {
  region.rejectUnknownKeys(REGION_KEYS)
  const read = {
    id: region.string('id', KEBAB_ID),
    name: region.string('name'),
    caption: region.string('caption'),
    guide: region.string('guide'),
    source: region.string('source'),
    missions: region.stringList('missions', KEBAB_ID),
  }
  if (region.has('missions') && read.missions.length === 0) {
    region.issues.add(region.pathOf('missions'), 'expected at least one mission')
  }
  reportDuplicates(read.missions, region.pathOf('missions'), region.issues)
  return read
}

/**
 * Checks a parsed `chapters.yaml`: the curriculum's stages in order, whether or not a stage has
 * missions yet. A chapter's stage number is its place in the list. Whether each region's missions
 * exist and are the chapter's own, in play order, is checked with the rest of the content.
 */
export function validateChapters(raw: unknown): Validated<readonly ChapterDefinition[]> {
  const issues = new Issues()
  const reader = new ObjectReader(raw, '', issues)
  reader.rejectUnknownKeys(['chapters'])
  const chapters = reader
    .list('chapters', (value, path) => {
      const chapter = new ObjectReader(value, path, issues)
      chapter.rejectUnknownKeys(CHAPTER_KEYS)
      const text = (key: string) => chapter.optional(key, (name) => chapter.string(name))
      const read = {
        id: chapter.string('id', KEBAB_ID),
        title: chapter.string('title'),
        summary: chapter.string('summary'),
      }
      const story = text('story')
      const guide = text('guide')
      const standsFor = text('standsFor')
      return {
        ...read,
        ...(story !== undefined && { story }),
        ...(guide !== undefined && { guide }),
        ...(standsFor !== undefined && { standsFor }),
        outcomes: chapter.has('outcomes') ? chapter.stringList('outcomes') : [],
        regions: chapter.has('regions')
          ? chapter.list('regions', (region, at) => readRegion(new ObjectReader(region, at, issues)))
          : [],
      }
    })
    .map((chapter, at): ChapterDefinition => ({ ...chapter, stage: at + 1 }))
  if (reader.has('chapters') && Array.isArray(reader.value('chapters')) && chapters.length === 0) {
    issues.add('chapters', 'expected at least one chapter')
  }
  reportDuplicates(
    chapters.map((chapter) => chapter.id),
    'chapters',
    issues
  )
  return issues.result(chapters)
}
