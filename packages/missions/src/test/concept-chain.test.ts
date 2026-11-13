import type { ConceptId, ConceptViolation, ConceptViolationKind } from '@peerfall/game/types'
import { conceptChain } from '@peerfall/game/utils'
import { describe, expect, it } from 'vitest'
import { appContent } from '#utils/loader/app-content.util'

// Today's breaks, each with why (docs/missions/concepts.md); writing the stages that are still
// missing empties this list.
const KNOWN_CONCEPT_GAPS: Readonly<Record<ConceptViolationKind, Readonly<Record<ConceptId, string>>>> = {
  'used-before-taught': {},
  'taught-twice': {},
  'never-used-again': {
    peer: 'named in 1.1 for the Peerfall; stage 3, which teaches peers, is not written yet',
    pathspace: 'a fact about the Machine, explained by a card of 1.2 only: no mission uses it as a skill',
    mgmtd: "named in 1.3; it is taught with FRR's northbound API in stage 11, not written yet",
    'frr-log': 'stage 3 reads the log to debug adjacencies; it is not written yet',
    ipv6: 'named in 2.1 for the fe80:: lines; IPv6 needs IPv6 in the network definition and the checks first',
    'floating-static':
      'taught in 2.5, the last lesson of stage 2; no mission after stage 2 that relies on it is written yet',
    ecmp: 'the last idea of stage 2; stage 3 makes equal-cost paths with OSPF, not written yet',
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
