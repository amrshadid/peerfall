import type { Validated } from '@peerfall/core/types'
import { Issues, ObjectReader, reportDuplicates } from '@peerfall/core/utils'
import { FIELD_GUIDE_KINDS, type FieldGuide, type FieldGuideEntry } from '#types/definitions/field-guide'
import { KEBAB_ID } from '#types/definitions/mission'

function readEntry(entry: ObjectReader): FieldGuideEntry {
  entry.rejectUnknownKeys(['name', 'kind', 'what', 'firstMet', 'deepenedIn'])
  return {
    name: entry.string('name'),
    kind: entry.oneOf('kind', FIELD_GUIDE_KINDS),
    what: entry.string('what'),
    firstMet: entry.string('firstMet', KEBAB_ID),
    deepenedIn: entry.has('deepenedIn') ? entry.stringList('deepenedIn', KEBAB_ID) : [],
  }
}

/**
 * Checks a parsed `field-guide.yaml`. Its mission ids (`firstMet`, `deepenedIn`) are checked
 * against the missions when the content is put together.
 */
export function validateFieldGuide(raw: unknown): Validated<FieldGuide> {
  const issues = new Issues()
  const reader = new ObjectReader(raw, '', issues)
  reader.rejectUnknownKeys(['entries'])
  const entries = reader.list('entries', (value, path) => readEntry(new ObjectReader(value, path, issues)))
  reportDuplicates(
    entries.map((entry) => `${entry.kind} ${entry.name}`),
    'entries',
    issues
  )
  return issues.result({ entries })
}
