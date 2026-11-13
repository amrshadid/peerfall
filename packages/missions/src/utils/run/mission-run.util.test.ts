import type { MissionDefinition, MissionVerdict } from '@peerfall/game/types'
import { judgeMission } from '@peerfall/game/utils'
import type { MachineState, StateRequest } from '@peerfall/machine/types'
import { describe, expect, it } from 'vitest'
import { keepMet, liveRead, type MissionMachine } from '#utils/run/mission-run.util'

const OBJECTIVES: MissionDefinition['objectives'] = [
  {
    id: 'described',
    text: 'lo has a description in the running configuration.',
    check: { kind: 'config', router: 'a', source: 'running', block: ['interface lo'], line: 'description' },
  },
  {
    id: 'saved',
    text: 'frr.conf has it.',
    check: { kind: 'config', router: 'a', source: 'saved', block: ['interface lo'], line: 'description' },
  },
]
const mission = { objectives: OBJECTIVES } as const

const config = (described: boolean) =>
  `hostname a\n!\ninterface lo\n${described ? ' description loopback\n' : ''}exit\n!\n`
const state = (running: boolean, saved: boolean): MachineState => ({
  routers: { a: { runningConfig: config(running), savedConfig: config(saved) } },
  pings: [],
})
const judge = (read: MachineState): MissionVerdict =>
  judgeMission({ objectives: OBJECTIVES } as unknown as MissionDefinition, [], read)
const met = (verdict: MissionVerdict) =>
  Object.fromEntries(verdict.objectives.map(({ objectiveId, result }) => [objectiveId, result.passed]))

describe('objectives judged live', () => {
  it('stay met once met, while the others follow the latest read', () => {
    const first = keepMet(null, judge(state(true, false)))
    expect(met(first)).toEqual({ described: true, saved: false })
    // The description was taken out of the running configuration: it was met, and stays met.
    const second = keepMet(first, judge(state(false, false)))
    expect(met(second)).toEqual({ described: true, saved: false })
    expect(second.passed).toBe(false)
    const third = keepMet(second, judge(state(false, true)))
    expect(met(third)).toEqual({ described: true, saved: true })
    expect(third.passed).toBe(true)
  })

  it('start from the latest read when nothing was met before', () => {
    const latest = judge(state(false, true))
    expect(keepMet(null, latest)).toBe(latest)
  })
})

describe('a live read', () => {
  const machineReading = (read: MachineState) => {
    const asked: StateRequest[] = []
    const machine: Pick<MissionMachine, 'events' | 'readState'> = {
      events: () => [],
      readState: async (request) => {
        asked.push(request)
        return { ok: true, value: read }
      },
    }
    return { machine, asked }
  }

  it('reads only what the checks need, once, and restarts nothing', async () => {
    const { machine, asked } = machineReading(state(true, true))
    const outcome = await liveRead(machine, mission)
    expect(outcome).toEqual({ ok: true, events: [], state: state(true, true) })
    expect(asked).toEqual([{ routers: { a: ['runningConfig', 'savedConfig'] }, pings: [] }])
  })

  it('has nothing to read on a mission judged by its fault run', async () => {
    const { machine, asked } = machineReading(state(true, true))
    const outcome = await liveRead(machine, {
      objectives: [{ id: 'recovers', text: 'Traffic recovers.', check: { kind: 'recovery', via: 'a-b' } }],
    } as unknown as MissionDefinition)
    expect(outcome.ok).toBe(false)
    expect(asked).toEqual([])
  })
})
