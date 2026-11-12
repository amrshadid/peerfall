import type { SaveMigration } from '#types/definitions/saves'

/** One entry per past save version; add one whenever SAVE_VERSION goes up. Version 1 is the first. */
export const SAVE_MIGRATIONS: readonly SaveMigration[] = []
