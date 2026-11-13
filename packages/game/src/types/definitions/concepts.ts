import type { MissionId } from '#types/definitions/mission'

/**
 * Where a concept sits in a network built on FRR: `foundations` for what every network shares
 * (addresses, packets), `linux` for the host FRR runs on, `frr` for FRR itself, then forwarding,
 * the routing protocols and families, and operating the whole.
 */
export const CONCEPT_PARTS = [
  'foundations',
  'linux',
  'frr',
  'forwarding',
  'routing',
  'ospf',
  'isis',
  'bfd',
  'bgp',
  'policy',
  'vrf',
  'mpls',
  'multicast',
  'operations',
] as const

/** A mission teaches at most this many concepts. */
export const CORE_CONCEPT_BUDGET = 3

/**
 * The first stages every later one builds on: a concept they teach or name that no later mission
 * uses again is a break in the chain.
 */
export const FOUNDATION_STAGES = 2

export const CONCEPT_VIOLATION_KINDS = ['used-before-taught', 'taught-twice', 'never-used-again'] as const

export type ConceptId = string
export type ConceptPart = (typeof CONCEPT_PARTS)[number]
export type ConceptViolationKind = (typeof CONCEPT_VIOLATION_KINDS)[number]

/** One entry of `concepts.yaml`. */
export interface Concept {
  readonly id: ConceptId
  /** As the player meets it: "routing table", "next hop". */
  readonly term: string
  readonly part: ConceptPart
  /** The Codex card that explains it. */
  readonly codex?: string
}

export interface ConceptViolation {
  readonly kind: ConceptViolationKind
  readonly concept: ConceptId
  /** The mission that uses it too early, teaches it again, or taught it with no mission using it after. */
  readonly missionId: MissionId
  /** The mission that teaches it later, or taught it first; null when there is none. */
  readonly other: MissionId | null
}
