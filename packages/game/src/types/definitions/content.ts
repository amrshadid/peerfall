import type { ChapterDefinition, ChapterId, MissionDefinition, MissionId } from '#types/definitions/mission'

/** What `createGameContent` checks and bundles: the parts as the loader validated them one by one. */
export interface GameContentParts {
  /** In curriculum order, from `chapters.yaml`. */
  readonly chapters: readonly ChapterDefinition[]
  /** In play order within each chapter, as their folders are numbered. */
  readonly missions: readonly MissionDefinition[]
}

/** The validated content the game plays. The engine knows missions only through this. */
export interface GameContent {
  readonly chapters: readonly ChapterDefinition[]
  /** In play order: by chapter, then as given within it. */
  readonly missions: readonly MissionDefinition[]
  mission(id: MissionId): MissionDefinition | undefined
  missionsIn(chapter: ChapterId): readonly MissionDefinition[]
}
