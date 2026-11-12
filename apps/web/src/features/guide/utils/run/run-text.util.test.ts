import type { ObjectiveHints } from '@peerfall/game/hooks'
import type { MissionDefinition, MissionVerdict, ObjectiveDefinition } from '@peerfall/game/types'
import type { MissionRunPhase } from '@peerfall/missions/hooks'
import { describe, expect, it } from 'vitest'
import { TRIANGLE } from '@/test/fixtures/network.fixture'
import { hintsLeftOf, hintTargetOf, revealedHintsOf, runStatusOf, taskOf, waitReasonOf } from './run-text.util'

const NAMES = { from: 'a', destination: '10.255.0.3', target: 'c' }
const MISSION = {
  fault: { link: ['a', 'c'] },
  probe: { id: 'a-to-c', from: 'a', source: '10.255.0.1', destination: '10.255.0.3', intervalMs: 50 },
  network: TRIANGLE,
} as const
/** A mission that breaks nothing and watches no traffic: its checks read the routers as they are. */
const QUIET: Pick<MissionDefinition, 'fault' | 'probe' | 'network'> = {
  network: { routers: [{ name: 'a', daemons: ['staticd'], config: '' }], links: [] },
}

const objective = (id: string): ObjectiveDefinition => ({
  id,
  text: id,
  check: { kind: 'reachable', minReplies: 3 },
  hints: [{ text: 'look' }, { text: 'type this', command: 'show ip route' }],
})

const hints = (id: string, revealed: number): ObjectiveHints => {
  const definition = objective(id)
  return {
    objective: definition,
    revealed: definition.hints.slice(0, revealed),
    left: definition.hints.length - revealed,
  }
}

const verdict = (passed: readonly string[], open: readonly string[]): MissionVerdict => ({
  passed: open.length === 0,
  objectives: [
    ...passed.map((objectiveId) => ({
      objectiveId,
      result: { kind: 'reachable', passed: true, failure: null, replies: 3 } as const,
    })),
    ...open.map((objectiveId) => ({
      objectiveId,
      result: { kind: 'reachable', passed: false, failure: 'unreachable', replies: 0 } as const,
    })),
  ],
})

describe('runStatusOf', () => {
  it('says the routers are starting, and for how long, while the network is built', () => {
    expect(runStatusOf('building', [], MISSION, NAMES)).toMatchObject({ busy: true, failed: false })
    expect(runStatusOf('building', [], MISSION, NAMES)?.text).toContain(
      'Starting the routers… about a minute the first time.'
    )
    expect(runStatusOf('settling', [], MISSION, NAMES)?.text).toContain('OSPF neighbors')
  })

  it('says plainly how long a fault run takes with BFD and without it', () => {
    const status = runStatusOf('faulted', [], MISSION, NAMES)
    expect(status?.text).toContain('then the link a–c starts dropping every packet')
    expect(status?.text).toContain('about 4 to 6 seconds when BFD runs on both ends')
    expect(status?.text).toContain('up to about a minute without it')
    expect(status?.text).toContain('what you change during the run is not kept')
  })

  it('names the probe while it is sent', () => {
    expect(runStatusOf('probing', [], MISSION, NAMES)?.text).toContain('one packet from a to 10.255.0.3 every 50 ms')
  })

  it('has nothing to say while the network is the player’s, unless the last run broke', () => {
    expect(runStatusOf('ready', [], MISSION, NAMES)).toBeNull()
    expect(runStatusOf('ready', ['The fault could not be injected'], MISSION, NAMES)).toMatchObject({
      failed: true,
      details: ['The fault could not be injected'],
    })
  })

  it('gives the Machine’s own words when the network could not be built', () => {
    expect(runStatusOf('failed', ['vtysh: exit 1'], MISSION, NAMES)).toMatchObject({
      failed: true,
      busy: false,
      details: ['vtysh: exit 1'],
    })
  })
})

describe('waitReasonOf', () => {
  it('holds the actions back in every phase but ready', () => {
    const phases: readonly MissionRunPhase[] = ['building', 'settling', 'probing', 'faulted', 'failed']
    for (const phase of phases) {
      expect(waitReasonOf(phase)).not.toBeNull()
    }
    expect(waitReasonOf('ready')).toBeNull()
  })
})

describe('taskOf', () => {
  it('uses the mission’s own names in every step of the loop', () => {
    expect(taskOf('inspect', MISSION, NAMES).join(' ')).toContain('makes the link a–c drop every packet')
    expect(taskOf('inspect', MISSION, NAMES).join(' ')).toContain('from a to c')
    expect(taskOf('predict', MISSION, NAMES).join(' ')).toContain('say what you expect')
    expect(taskOf('apply', MISSION, NAMES)).toHaveLength(1)
    expect(taskOf('verify', MISSION, NAMES).join(' ')).toContain('read the debrief')
  })

  it('asks for no baseline in a mission that breaks nothing', () => {
    expect(taskOf('inspect', QUIET, NAMES).join(' ')).not.toContain('Break the link')
    expect(taskOf('inspect', QUIET, NAMES).join(' ')).toContain('work through the objectives below')
  })
})

describe('runStatusOf without OSPF', () => {
  it('does not speak of OSPF neighbors where no router runs OSPF', () => {
    expect(runStatusOf('settling', [], QUIET, NAMES)?.text).toBe(
      'The routers are up and FRR is settling on each of them. A few seconds more.'
    )
  })
})

describe('hints', () => {
  const entries = [hints('first', 1), hints('second', 0), hints('third', 2)]

  it('aims the next hint at the first objective still open', () => {
    expect(hintTargetOf(entries, null)).toBe('first')
    expect(hintTargetOf(entries, verdict(['first'], ['second', 'third']))).toBe('second')
  })

  it('falls back to any objective with a hint left, and to none when all are shown', () => {
    expect(hintTargetOf(entries, verdict(['first', 'second'], ['third']))).toBe('first')
    expect(hintTargetOf([hints('third', 2)], null)).toBeNull()
  })

  it('lists the hints shown, each with its objective, its stage and its command', () => {
    expect(revealedHintsOf(entries)).toEqual([
      { stage: 'objective 1, step 1 of 2', text: 'look', command: null },
      { stage: 'objective 3, step 1 of 2', text: 'look', command: null },
      { stage: 'objective 3, step 2 of 2', text: 'type this', command: 'show ip route' },
    ])
    expect(hintsLeftOf(entries)).toBe(3)
  })
})
