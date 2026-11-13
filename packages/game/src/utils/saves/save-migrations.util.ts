import { isRecord } from '@peerfall/core/utils'
import { HINT_TIERS } from '#types/definitions/hints'
import type { SaveMigration } from '#types/definitions/saves'

/**
 * Version 1 counted hints per objective; from version 2 a mission has three hints of its own.
 * The counts add up, capped at three: a player who saw every hint of an objective has seen help,
 * and keeps it.
 */
function missionHints(mission: unknown): unknown {
  if (!isRecord(mission) || !isRecord(mission.hintsRevealed)) {
    return mission
  }
  const counts = Object.values(mission.hintsRevealed).filter(
    (count): count is number => typeof count === 'number' && Number.isInteger(count) && count > 0
  )
  const total = counts.reduce((sum, count) => sum + count, 0)
  return { ...mission, hintsRevealed: Math.min(total, HINT_TIERS.length) }
}

const PER_MISSION_HINTS: SaveMigration = {
  from: 1,
  migrate(save) {
    const progress = save.progress
    if (!isRecord(progress) || !Array.isArray(progress.missions)) {
      return { ...save }
    }
    return { ...save, progress: { ...progress, missions: progress.missions.map(missionHints) } }
  },
}

/** One entry per past save version; add one whenever SAVE_VERSION goes up. Version 1 is the first. */
export const SAVE_MIGRATIONS: readonly SaveMigration[] = [PER_MISSION_HINTS]
