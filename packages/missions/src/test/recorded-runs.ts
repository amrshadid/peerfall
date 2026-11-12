import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { StampedMachineEvent } from '@peerfall/machine/types'

/** One golden run as `pnpm vm:golden` recorded it on the real image. */
export interface RecordedRun {
  readonly mission: string
  /** The mission's version when it was recorded: an older one has to be recorded again. */
  readonly version: number
  readonly run: string
  /** What the mission's solution.yaml says the verdict must be. */
  readonly passes: boolean
  readonly events: readonly StampedMachineEvent[]
}

const RUNS_DIR = join(dirname(fileURLToPath(import.meta.url)), 'runs')

/** Every recorded run of a mission, by file name. */
export function recordedRuns(mission: string): RecordedRun[] {
  const dir = join(RUNS_DIR, mission)
  return readdirSync(dir)
    .filter((name) => name.endsWith('.json'))
    .sort()
    .map((name) => JSON.parse(readFileSync(join(dir, name), 'utf8')) as RecordedRun)
}
