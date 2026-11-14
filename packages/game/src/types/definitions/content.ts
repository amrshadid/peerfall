import type { Concept, ConceptId } from '#types/definitions/concepts'
import type { FieldGuide } from '#types/definitions/field-guide'
import type { ChapterDefinition, ChapterId, CodexCard, MissionDefinition, MissionId } from '#types/definitions/mission'
import type { SkillDefinition, SkillId } from '#types/definitions/skills'

/** What `createGameContent` checks and bundles: the parts as the loader validated them one by one. */
export interface GameContentParts {
  /** In curriculum order, from `chapters.yaml`. */
  readonly chapters: readonly ChapterDefinition[]
  /** In play order within each chapter, as their folders are numbered. */
  readonly missions: readonly MissionDefinition[]
  /** `concepts.yaml`; left out, the missions' concept ids are not checked. */
  readonly concepts?: readonly Concept[]
  /** `field-guide.yaml`; left out, the Field Guide is empty. */
  readonly fieldGuide?: FieldGuide
  /** `skills.yaml`; left out, the missions' skill ids are not checked against it. */
  readonly skills?: readonly SkillDefinition[]
}

/** The validated content the game plays. The engine knows missions only through this. */
export interface GameContent {
  readonly chapters: readonly ChapterDefinition[]
  /** In play order: by chapter, then as given within it. */
  readonly missions: readonly MissionDefinition[]
  readonly concepts: readonly Concept[]
  readonly fieldGuide: FieldGuide
  /** The skill tree, in the order of `skills.yaml`. */
  readonly skills: readonly SkillDefinition[]
  mission(id: MissionId): MissionDefinition | undefined
  skill(id: SkillId): SkillDefinition | undefined
  /** The mission that earns the skill. */
  earnedIn(id: SkillId): MissionDefinition | undefined
  missionsIn(chapter: ChapterId): readonly MissionDefinition[]
  /** `1.2`: the chapter's stage, then the mission's place in it, from 1. */
  numberOf(id: MissionId): string | undefined
  concept(id: ConceptId): Concept | undefined
  /** A Codex card by id, with the mission that adds it. */
  card(id: string): { readonly card: CodexCard; readonly missionId: MissionId } | undefined
}
