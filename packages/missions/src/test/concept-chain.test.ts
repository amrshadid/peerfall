import type { ConceptId, ConceptViolation, ConceptViolationKind } from '@peerfall/game/types'
import { conceptChain } from '@peerfall/game/utils'
import { describe, expect, it } from 'vitest'
import { appContent } from '#utils/loader/app-content.util'

// Today's breaks, each with why; writing the missions that are still missing empties this list.
const KNOWN_CONCEPT_GAPS: Readonly<Record<ConceptViolationKind, Readonly<Record<ConceptId, string>>>> = {
  'used-before-taught': {
    'ospf-adjacency': '4.1 relies on OSPF neighbors; stage 3, which teaches them, is not written yet',
  },
  'taught-twice': {},
  'never-used-again': {
    'static-route': 'stage 2 ends with 2.2 for now; the missions after it are not written yet',
  },
}

const loaded = appContent()
if (!loaded.ok) {
  throw new Error(loaded.errors.join('\n'))
}
const content = loaded.value.game
const violations = conceptChain(content)
const numberOf = (missionId: string) => content.numberOf(missionId) ?? missionId
const describeViolation = (violation: ConceptViolation) =>
  `${violation.kind}: ${violation.concept} in ${numberOf(violation.missionId)}${violation.other ? ` (${numberOf(violation.other)})` : ''}`

describe('the chain of concepts', () => {
  it('has no break but the known ones', () => {
    const unknown = violations.filter(
      (violation) => KNOWN_CONCEPT_GAPS[violation.kind][violation.concept] === undefined
    )
    expect(unknown.map(describeViolation)).toEqual([])
  })

  it('lists only known gaps that are still there', () => {
    const stale = Object.entries(KNOWN_CONCEPT_GAPS).flatMap(([kind, gaps]) =>
      Object.keys(gaps)
        .filter((concept) => !violations.some((violation) => violation.kind === kind && violation.concept === concept))
        .map((concept) => `${kind}: ${concept}`)
    )
    expect(stale).toEqual([])
  })
})
