import { describe, expect, it } from 'vitest'
import { baselineRun, bfdBothEndsRun, EXAMPLE_MISSION } from '#test/index'
import type { Progress } from '#types/definitions/progress'
import { SAVE_FORMAT, SAVE_VERSION } from '#types/definitions/saves'
import { judgeMission } from '#utils/checks/index'
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
      hintsRevealed: 2,
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

  it('round-trips an open debrief with its verdict, every kind of check result in it', () => {
    const route = { prefix: '10.0.2.0/30', protocol: 'kernel', nextHops: [{ via: null, interface: 'a-c' }] }
    const rib = {
      prefix: '10.255.0.3/32',
      protocol: 'static',
      distance: 1,
      metric: 0,
      selected: true,
      installed: true,
      nextHops: [{ via: '10.0.1.2', interface: null }],
    }
    const debrief: Progress['debrief'] = {
      missionId: MISSION_ID,
      verdict: {
        passed: true,
        objectives: [
          ...judgeMission(EXAMPLE_MISSION, bfdBothEndsRun(), null).objectives,
          {
            objectiveId: 'daemons',
            result: { kind: 'daemons', passed: true, failure: null, router: 'a', running: ['zebra'], missing: [] },
          },
          { objectiveId: 'route', result: { kind: 'route', passed: true, failure: null, router: 'a', route } },
          {
            objectiveId: 'rib',
            result: { kind: 'rib', passed: true, failure: null, router: 'a', routes: [rib], found: rib },
          },
          {
            objectiveId: 'reaches',
            result: { kind: 'reaches', passed: true, failure: null, from: 'a', to: '10.0.2.2', sent: 3, received: 3 },
          },
          {
            objectiveId: 'config',
            result: {
              kind: 'config',
              passed: false,
              failure: 'not_configured',
              router: 'a',
              source: 'saved',
              found: null,
            },
          },
        ],
      },
    }
    const progress: Progress = { ...PROGRESS, debrief }
    const stored = JSON.parse(JSON.stringify(toSaveFile(progress, 99)))
    expect(readSaveFile(stored)).toEqual({ ok: true, value: { progress, savedAt: 99, migratedFrom: null } })
  })

  it('loads a save written before the debrief field existed, and refuses a broken one', () => {
    const stored = JSON.parse(JSON.stringify(toSaveFile(PROGRESS, 99)))
    expect(readSaveFile(stored)).toMatchObject({ ok: true, value: { progress: PROGRESS } })
    expect('debrief' in PROGRESS).toBe(false)
    const broken = {
      ...stored,
      progress: { ...stored.progress, debrief: { missionId: MISSION_ID, verdict: { passed: 'yes' } } },
    }
    expect(readSaveFile(broken).ok).toBe(false)
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
        missions: [{ ...mission, hintsRevealed: 'two', runs: [{ role: 'replay' }] }],
      },
    }
    const loaded = readSaveFile(JSON.parse(JSON.stringify(corrupt)))
    expect(!loaded.ok && loaded.errors).toEqual(
      expect.arrayContaining([
        'progress.missions[0].hintsRevealed: expected a whole number, got text',
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
