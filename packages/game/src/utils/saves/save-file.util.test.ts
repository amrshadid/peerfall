import { describe, expect, it } from 'vitest'
import { baselineRun, bfdBothEndsRun, EXAMPLE_MISSION } from '#test/index'
import type { Progress } from '#types/definitions/progress'
import { SAVE_FORMAT, SAVE_VERSION } from '#types/definitions/saves'
import { emptyProgress } from '#utils/progress/index'
import { summariseRun } from '#utils/runs/index'
import { exportSave, importSave, parseJson, readSaveFile, toSaveFile } from '#utils/saves/save-file.util'

const MISSION_ID = EXAMPLE_MISSION.id

const PROGRESS: Progress = {
  missions: [
    {
      missionId: MISSION_ID,
      firstStartedAt: 10,
      completedAt: 20,
      attempts: 2,
      hintsRevealed: { 'recovers-through-b': 2 },
      runs: [
        {
          role: 'baseline',
          missionVersion: 1,
          savedAt: 12,
          passed: false,
          summary: summariseRun(baselineRun(), EXAMPLE_MISSION),
        },
        {
          role: 'attempt',
          missionVersion: 1,
          savedAt: 20,
          passed: true,
          summary: summariseRun(bfdBothEndsRun(), EXAMPLE_MISSION),
        },
      ],
    },
  ],
  completionOrder: [MISSION_ID],
  lastActive: MISSION_ID,
}

describe('parseJson', () => {
  it('parses JSON, and hands back text that is not JSON so validation can say what is wrong', () => {
    expect(parseJson('{"version":2}')).toEqual({ version: 2 })
    expect(parseJson('{"version":')).toBe('{"version":')
  })
})

describe('save files', () => {
  it('round-trips progress through JSON, as storage keeps it', () => {
    const stored = JSON.parse(JSON.stringify(toSaveFile(PROGRESS, 99)))
    expect(readSaveFile(stored)).toEqual({
      ok: true,
      value: { progress: PROGRESS, savedAt: 99, migratedFrom: null },
    })
  })

  it('treats an empty slot as a new game', () => {
    const loaded = readSaveFile(undefined)
    expect(loaded).toEqual({
      ok: true,
      value: { progress: emptyProgress(), savedAt: null, migratedFrom: null },
    })
  })

  it('exports and imports a JSON string', () => {
    const imported = importSave(exportSave(PROGRESS, 7))
    expect(imported.ok && imported.value.progress).toEqual(PROGRESS)
    expect(importSave('{not json')).toEqual({ ok: false, errors: ['the file is not valid JSON'] })
    expect(importSave('{"hello": 1}')).toEqual({ ok: false, errors: ['not a Peerfall save'] })
  })

  it('runs migrations one version at a time', () => {
    const oldSave = { format: SAVE_FORMAT, version: 1, savedAt: 3, state: PROGRESS }
    const schema = {
      version: 2,
      migrations: [
        {
          from: 1,
          migrate: ({ state, ...rest }: Readonly<Record<string, unknown>>) => ({
            ...rest,
            progress: state,
          }),
        },
      ],
    }
    expect(readSaveFile(oldSave, schema)).toEqual({
      ok: true,
      value: { progress: PROGRESS, savedAt: 3, migratedFrom: 1 },
    })
    expect(readSaveFile(oldSave, { version: 3, migrations: schema.migrations })).toEqual({
      ok: false,
      errors: ['no migration from save version 2'],
    })
  })

  it('refuses saves from a newer game', () => {
    const future = { ...toSaveFile(PROGRESS, 1), version: SAVE_VERSION + 1 }
    expect(readSaveFile(future)).toEqual({
      ok: false,
      errors: [`the save is from a newer version of the game (save ${SAVE_VERSION + 1}, game ${SAVE_VERSION})`],
    })
  })

  it('reports every corrupt field with its path', () => {
    const [mission] = PROGRESS.missions
    const corrupt = {
      ...toSaveFile(PROGRESS, 1),
      progress: {
        ...PROGRESS,
        lastActive: 7,
        missions: [{ ...mission, hintsRevealed: { 'reaches-c': 'two' }, runs: [{ role: 'replay' }] }],
      },
    }
    const loaded = readSaveFile(JSON.parse(JSON.stringify(corrupt)))
    expect(!loaded.ok && loaded.errors).toEqual(
      expect.arrayContaining([
        'progress.missions[0].hintsRevealed.reaches-c: expected a whole number, got text',
        'progress.missions[0].runs[0].role: expected one of baseline, attempt, got "replay"',
        'progress.missions[0].runs[0].summary: expected an object, got nothing',
        'progress.lastActive: expected non-empty text, got a number',
      ])
    )
  })

  it("keeps the Machine's times as they are, fractions of a millisecond included", () => {
    const [mission] = PROGRESS.missions
    const [baseline] = mission?.runs ?? []
    const precise = {
      ...PROGRESS,
      missions: [
        { ...mission, runs: [{ ...baseline, summary: { ...baseline?.summary, faultAtMs: 1_800_000_005_000.25 } }] },
      ],
    }
    const loaded = readSaveFile(JSON.parse(JSON.stringify(toSaveFile(precise as Progress, 1))))
    expect(loaded.ok && loaded.value.progress.missions[0]?.runs[0]?.summary.faultAtMs).toBe(1_800_000_005_000.25)
  })
})
