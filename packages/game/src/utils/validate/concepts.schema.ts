import type { Validated } from '@peerfall/core/types'
import { Issues, ObjectReader, reportDuplicates } from '@peerfall/core/utils'
import { CONCEPT_PARTS, type Concept } from '#types/definitions/concepts'
import { KEBAB_ID } from '#types/definitions/mission'

/**
 * Checks a parsed `concepts.yaml`: every concept a mission may teach, name or use. Whether a
 * concept's card exists is checked with the rest of the content, by `createGameContent`.
 */
export function validateConcepts(raw: unknown): Validated<readonly Concept[]> {
  const issues = new Issues()
  const reader = new ObjectReader(raw, '', issues)
  reader.rejectUnknownKeys(['concepts'])
  const concepts = reader.list('concepts', (value, path) => {
    const concept = new ObjectReader(value, path, issues)
    concept.rejectUnknownKeys(['id', 'term', 'part', 'codex'])
    const read = {
      id: concept.string('id', KEBAB_ID),
      term: concept.string('term'),
      part: concept.oneOf('part', CONCEPT_PARTS),
    }
    const codex = concept.optional('codex', (key) => concept.string(key, KEBAB_ID))
    return { ...read, ...(codex !== undefined && { codex }) }
  })
  reportDuplicates(
    concepts.map((concept) => concept.id),
    'concepts',
    issues
  )
  return issues.result(concepts)
}
