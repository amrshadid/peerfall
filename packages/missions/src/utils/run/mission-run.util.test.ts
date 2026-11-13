import type { MissionDefinition } from '@peerfall/game/types'
import type { MachineState, StateRequest } from '@peerfall/machine/types'
import { describe, expect, it } from 'vitest'
import { liveRead, type MissionMachine } from '#utils/run/mission-run.util'

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
