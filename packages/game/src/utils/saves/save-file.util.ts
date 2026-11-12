import type { Validated } from '@peerfall/core/types'
import { Issues, isRecord, ObjectReader } from '@peerfall/core/utils'
import type { EpochMs, Progress } from '#types/definitions/progress'
import type { LoadedSave, SaveFile, SaveSchema } from '#types/definitions/saves'
import { SAVE_FORMAT, SAVE_VERSION } from '#types/definitions/saves'
import { emptyProgress } from '#utils/progress/index'
import { readProgress } from '#utils/saves/read-progress.util'
import { SAVE_MIGRATIONS } from '#utils/saves/save-migrations.util'

export function toSaveFile(progress: Progress, savedAt: EpochMs): SaveFile {
  return { format: SAVE_FORMAT, version: SAVE_VERSION, savedAt, progress }
}

const CURRENT_SCHEMA: SaveSchema = { version: SAVE_VERSION, migrations: SAVE_MIGRATIONS }

/**
 * Turns stored data back into progress: checks the format, migrates old
 * versions one step at a time, then validates. An empty slot (`undefined`)
 * is a fresh game, not an error.
 */
export function readSaveFile(raw: unknown, schema: SaveSchema = CURRENT_SCHEMA): Validated<LoadedSave> {
  if (raw === undefined) {
    return { ok: true, value: { progress: emptyProgress(), savedAt: null, migratedFrom: null } }
  }
  const migrated = migrateSave(raw, schema)
  if (!migrated.ok) {
    return migrated
  }
  const issues = new Issues()
  const save = new ObjectReader(migrated.value.save, '', issues)
  const loaded: LoadedSave = {
    progress: readProgress(migrated.value.save.progress, 'progress', issues),
    savedAt: save.integer('savedAt', 0),
    migratedFrom: migrated.value.from === schema.version ? null : migrated.value.from,
  }
  return issues.result(loaded)
}

interface Migrated {
  readonly save: Readonly<Record<string, unknown>>
  readonly from: number
}

function migrateSave(raw: unknown, schema: SaveSchema): Validated<Migrated> {
  if (!isRecord(raw) || raw.format !== SAVE_FORMAT) {
    return { ok: false, errors: ['not a Peerfall save'] }
  }
  const from = raw.version
  if (typeof from !== 'number' || !Number.isInteger(from) || from < 1) {
    return { ok: false, errors: [`version: expected a whole number, got ${JSON.stringify(from)}`] }
  }
  if (from > schema.version) {
    return {
      ok: false,
      errors: [`the save is from a newer version of the game (save ${from}, game ${schema.version})`],
    }
  }
  let save: Readonly<Record<string, unknown>> = raw
  for (let version = from; version < schema.version; version++) {
    const migration = schema.migrations.find((candidate) => candidate.from === version)
    if (!migration) {
      return { ok: false, errors: [`no migration from save version ${version}`] }
    }
    save = { ...migration.migrate(save), format: SAVE_FORMAT, version: version + 1 }
  }
  return { ok: true, value: { save, from } }
}

/** Parsed JSON, or the text itself so validation reports what's wrong with it. */
export function parseJson(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

/** The save as pretty JSON, for the player to download and keep. */
export function exportSave(progress: Progress, savedAt: EpochMs): string {
  return JSON.stringify(toSaveFile(progress, savedAt), null, 2)
}

/** Reads a save exported with `exportSave`, from any supported version. */
export function importSave(json: string, schema: SaveSchema = CURRENT_SCHEMA): Validated<LoadedSave> {
  let raw: unknown
  try {
    raw = JSON.parse(json)
  } catch {
    return { ok: false, errors: ['the file is not valid JSON'] }
  }
  return raw === undefined ? { ok: false, errors: ['not a Peerfall save'] } : readSaveFile(raw, schema)
}
