import { describe, expect, it } from 'vitest'
import { goldenMission } from '#test/index'

// Runs recorded on the real Machine by `pnpm vm:golden gone-after-the-restart`. Nothing restarts
// FRR for the player: `survives` reads the frr.conf FRR's init script last started a from.
const golden = goldenMission('gone-after-the-restart')
const DESCRIPTION = 'interface lo\n description loopback of router a\n'
const configs = (id: string) => {
  const router = golden.run(id).state?.routers.a
  return {
    saved: router?.savedConfig ?? '',
    started: router?.startedConfig ?? null,
  }
}

describe('Gone After the Restart, on the Machine', () => {
  it('has all four golden runs, recorded for this version of the mission', () => {
    expect(golden.runs.map((recorded) => recorded.run).sort()).toEqual([
      'not-saved',
      'saved',
      'saved-and-restarted',
      'start',
    ])
    for (const recorded of golden.runs) {
      expect(recorded.version).toBe(golden.mission.version)
    }
  })

  it('judges every run as its solution says', () => {
    for (const recorded of golden.runs) {
      expect([recorded.run, golden.verdict(recorded.run).passed]).toEqual([recorded.run, recorded.passes])
    }
  })

  it('restarts nothing before the check: the player restarts FRR', () => {
    expect(golden.mission.restartOnCheck).toBeUndefined()
  })

  it('start: frr.conf has no description, and the mission is not passed', () => {
    expect(configs('start').saved).not.toContain('description')
    expect(golden.objectives('start')).toEqual({ saved: false, survives: false })
  })

  it('configured and not saved: never in frr.conf', () => {
    expect(configs('not-saved').saved).not.toContain('description')
    expect(configs('not-saved').started).toBeNull()
    expect(golden.objectives('not-saved')).toEqual({ saved: false, survives: false })
  })

  it('saved with write memory and not restarted: in frr.conf, not yet shown to survive', () => {
    expect(configs('saved').saved).toContain(DESCRIPTION)
    expect(configs('saved').started).toBeNull()
    expect(golden.objectives('saved')).toEqual({ saved: true, survives: false })
  })

  it('saved, then restarted with FRR’s init script: FRR started from a frr.conf that has it', () => {
    expect(configs('saved-and-restarted').started).toContain(DESCRIPTION)
    expect(configs('saved-and-restarted').saved).toContain(DESCRIPTION)
    expect(golden.objectives('saved-and-restarted')).toEqual({ saved: true, survives: true })
  })
})
