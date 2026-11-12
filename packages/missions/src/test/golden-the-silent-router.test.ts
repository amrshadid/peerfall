import { describe, expect, it } from 'vitest'
import { goldenMission } from '#test/index'

// Runs recorded on the real Machine by `pnpm vm:golden the-silent-router`, judged again here by
// the mission's own checks from the state that was read as root.
const golden = goldenMission('the-silent-router')
const daemons = (id: string) => golden.run(id).state?.routers.a?.daemons

describe('The Silent Router, on the Machine', () => {
  it('has all five golden runs, recorded for this version of the mission', () => {
    expect(golden.runs.map((recorded) => recorded.run).sort()).toEqual([
      'by-hand-then-init-script',
      'daemons-by-hand',
      'init-script',
      'start',
      'zebra-by-hand',
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

  it('needs no fault and no probe: it is judged from the state alone', () => {
    expect(golden.mission.fault).toBeUndefined()
    expect(golden.mission.probe).toBeUndefined()
    expect(golden.runs.every((recorded) => recorded.events.length === 0)).toBe(true)
  })

  it('start: nothing of FRR runs, and the mission is not passed', () => {
    expect(daemons('start')).toEqual([])
    expect(golden.objectives('start')).toEqual({ 'daemons-answer': false, 'watchfrr-watches': false })
  })

  it('zebra started by hand: vtysh has one daemon to talk to, and FRR is not whole', () => {
    expect(daemons('zebra-by-hand')).toEqual(['zebra'])
    expect(golden.objectives('zebra-by-hand')).toEqual({ 'daemons-answer': false, 'watchfrr-watches': false })
  })

  it('every daemon started by hand: they answer, and nothing watches them', () => {
    expect(daemons('daemons-by-hand')).toEqual(['mgmtd', 'zebra', 'staticd'])
    expect(golden.objectives('daemons-by-hand')).toEqual({ 'daemons-answer': true, 'watchfrr-watches': false })
  })

  it('FRR’s init script: watchfrr and the three daemons it started all answer', () => {
    for (const id of ['init-script', 'by-hand-then-init-script']) {
      expect(daemons(id)).toEqual(['mgmtd', 'zebra', 'staticd', 'watchfrr'])
      expect(golden.objectives(id)).toEqual({ 'daemons-answer': true, 'watchfrr-watches': true })
    }
  })
})
