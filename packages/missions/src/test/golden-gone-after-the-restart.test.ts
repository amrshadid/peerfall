import { describe, expect, it } from 'vitest'
import { goldenMission } from '#test/index'

// Runs recorded on the real Machine by `pnpm vm:golden gone-after-the-restart`. FRR was restarted
// on a before each state was read, so what is judged is what the restart left.
const golden = goldenMission('gone-after-the-restart')
const DESCRIPTION = 'interface lo\n description loopback of router a\n'
const configs = (id: string) => {
  const router = golden.run(id).state?.routers.a
  return { running: router?.runningConfig ?? '', saved: router?.savedConfig ?? '' }
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

  it('restarts FRR on a before the check', () => {
    expect(golden.mission.restartOnCheck).toEqual(['a'])
  })

  it('start: neither configuration has a description, and the mission is not passed', () => {
    expect(configs('start').running).not.toContain('description')
    expect(configs('start').saved).not.toContain('description')
    expect(golden.objectives('start')).toEqual({ saved: false, survives: false })
  })

  it('configured and not saved: the restart took the description away', () => {
    expect(configs('not-saved').running).not.toContain('description')
    expect(configs('not-saved').saved).not.toContain('description')
    expect(golden.objectives('not-saved')).toEqual({ saved: false, survives: false })
  })

  it('saved with write memory: frr.conf has it and the restarted router runs it', () => {
    for (const id of ['saved', 'saved-and-restarted']) {
      expect(configs(id).saved).toContain(DESCRIPTION)
      expect(configs(id).running).toContain(DESCRIPTION)
      expect(golden.objectives(id)).toEqual({ saved: true, survives: true })
    }
  })
})
