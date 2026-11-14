import type { StringRule } from '@peerfall/core/types'
import type { LinkName, NetworkDefinition, ProbeDefinition } from '@peerfall/machine/types'
import type { CheckDefinition } from '#types/definitions/checks'
import type { ConceptId } from '#types/definitions/concepts'
import type { SkillId } from '#types/definitions/skills'

export type MissionId = string
export type ChapterId = string
export type ObjectiveId = string

/** Ids never change when folders are renumbered, so they carry no number. */
export const KEBAB_ID: StringRule = {
  pattern: /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/,
  expected: 'a kebab-case id like recover-from-failure',
}

/** A stage of the curriculum, as `chapters.yaml` lists it, and its title page in the Codex. */
export interface ChapterDefinition {
  readonly id: ChapterId
  /** Its place in the curriculum, from 1: the order of `chapters.yaml`. */
  readonly stage: number
  readonly title: string
  readonly summary: string
  /** The stage's story in a few lines, for the Codex chapter's title page. */
  readonly story?: string
  /** The character who guides the stage: a real FRR daemon, such as `zebra`. */
  readonly guide?: string
  /** The real part of FRR the stage stands for, such as "zebra and the kernel's routing table". */
  readonly standsFor?: string
  /** "You can now…" lines, shown once every mission of the stage is completed. */
  readonly outcomes: readonly string[]
  /** Its missions grouped in play order, as the map draws them; empty for a stage with no missions yet. */
  readonly regions: readonly RegionDefinition[]
}

/** A part of a stage: a few missions on one subject, with its own heading on the map. */
export interface RegionDefinition {
  /** Unique across the game. */
  readonly id: string
  readonly name: string
  /** What its missions cover, in a few words: "FRR's daemons, how FRR is started and kept running". */
  readonly caption: string
  /** The FRR daemon who speaks in its missions. */
  readonly guide: string
  /** Where it lives in FRR's source tree, as Kernelfall prints a region's kernel source. */
  readonly source: string
  /** Its missions by id, in play order. */
  readonly missions: readonly MissionId[]
}

/** One of the mission's three hints: a nudge, then the concept, then the spot. Never the fix itself. */
export interface HintDefinition {
  readonly text: string
  /** What to type, on the third hint only, when pointing at the spot needs a command. */
  readonly command?: string
}

/** A command "build it" offers as a button, with one line on what it does. */
export interface CommandChip {
  /** The whole line in the first missions (`show interface brief`), the command's name alone later. */
  readonly command: string
  /** One line: "list the router's interfaces and whether each is up". */
  readonly explain: string
}

/** One Codex card: a concept in plain words, then FRR's side of it. Ids are unique across the game. */
export interface CodexCard {
  readonly id: string
  /** As the player meets it: "zebra", "the RIB". */
  readonly term: string
  /** The plain-words line (25 words at most). */
  readonly simple: string
  /** FRR's side: daemons, functions, files (80 words at most). */
  readonly deep?: string
  /** An earlier card this one adds to, by id, instead of starting a new chain. */
  readonly deepens?: string
  /** Paths in FRR's source tree, such as `zebra/zebra_rib.c`. */
  readonly sources: readonly string[]
  /** An https:// link to FRR's documentation or an RFC. */
  readonly docs?: string
  /** A command or two to try on a real router. */
  readonly tryIt?: string
}

/**
 * Sections of the mission's `story.md`, as `story.md#<section>`. The scene, the debrief and the
 * real-world card are always there; the guided steps between them are written by the missions
 * that have them.
 */
export interface StoryRefs {
  readonly scene: string
  readonly seeIt?: string
  readonly buildIt?: string
  readonly watchIt?: string
  readonly debrief: string
  readonly realWorld: string
}

/** One outcome the player has to bring about, judged from the Machine's events or its state by its `check`. */
export interface ObjectiveDefinition {
  readonly id: ObjectiveId
  readonly text: string
  readonly check: CheckDefinition
}

/** The link that stops passing packets, both ways, while its interfaces stay up. */
export interface FaultDefinition {
  /** Its two routers, in the order the network's link gives them. */
  readonly link: LinkName
}

/** A parsed and validated `mission.yaml`. */
export interface MissionDefinition {
  readonly id: MissionId
  /** Goes up when the mission changes in a way that makes saved runs incomparable. */
  readonly version: number
  readonly title: string
  /** The map's plain-words note: one or two sentences on what the player does and learns. */
  readonly summary?: string
  /** About how long it takes a new player, 1 to 120. */
  readonly minutes?: number
  readonly chapter: ChapterId
  /** The whole mission in one sentence. */
  readonly objective: string
  /** The skills of `skills.yaml` it earns once completed. */
  readonly skills: readonly SkillId[]
  /** The skills it needs: it opens once missions completed earlier have earned every one. */
  readonly prerequisites: readonly SkillId[]
  /** Concepts of `concepts.yaml` it introduces, at most `CORE_CONCEPT_BUDGET`. */
  readonly teaches: readonly ConceptId[]
  /** Concepts it only names on the big picture; a later mission teaches them. */
  readonly names: readonly ConceptId[]
  /** Concepts an earlier mission taught that it relies on. */
  readonly uses: readonly ConceptId[]
  /** Commands "build it" offers as buttons. */
  readonly chips: readonly CommandChip[]
  /** The Codex cards it adds. */
  readonly codex: readonly CodexCard[]
  readonly story: StoryRefs
  /** Exactly three, in `HINT_TIERS` order: nudge, concept, spot. */
  readonly hints: readonly HintDefinition[]
  readonly network: NetworkDefinition
  /** Left out by a mission that breaks nothing: its checks read the Machine's state instead of a fault run. */
  readonly fault?: FaultDefinition
  /** Left out by a mission with no traffic to watch. */
  readonly probe?: ProbeDefinition
  /** Traffic must be back within this long after the fault, unless a check states its own limit. */
  readonly recoveryTargetMs?: number
  /**
   * Routers whose FRR is restarted, from its saved frr.conf, just before the player's work is
   * checked: what is judged is what survives a restart. Each is started by `watchfrr` or `none`.
   */
  readonly restartOnCheck?: readonly string[]
  /** In the order the player meets them. */
  readonly objectives: readonly ObjectiveDefinition[]
}

/** What the checks and the run summary need to know about a mission to read its events. */
export type RunContext = Pick<MissionDefinition, 'probe' | 'fault' | 'recoveryTargetMs'>
