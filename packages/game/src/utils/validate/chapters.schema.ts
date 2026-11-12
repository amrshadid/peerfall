import type { Validated } from '@peerfall/core/types'
import { Issues, ObjectReader, reportDuplicates } from '@peerfall/core/utils'
import { type ChapterDefinition, KEBAB_ID } from '#types/definitions/mission'

/**
 * Checks a parsed `chapters.yaml`: the curriculum's stages in order, whether or not a stage has
 * missions yet. A chapter's stage number is its place in the list.
 */
export function validateChapters(raw: unknown): Validated<readonly ChapterDefinition[]> {
  const issues = new Issues()
  const reader = new ObjectReader(raw, '', issues)
  reader.rejectUnknownKeys(['chapters'])
  const chapters = reader
    .list('chapters', (value, path) => {
      const chapter = new ObjectReader(value, path, issues)
      chapter.rejectUnknownKeys(['id', 'title', 'summary'])
      return { id: chapter.string('id', KEBAB_ID), title: chapter.string('title'), summary: chapter.string('summary') }
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
