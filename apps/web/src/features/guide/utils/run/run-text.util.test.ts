import type { MissionDefinition } from '@peerfall/game/types'
import type { MissionRunPhase } from '@peerfall/missions/hooks'
import { describe, expect, it } from 'vitest'
import { TRIANGLE } from '@/test/fixtures/network.fixture'
import { hasStateChecks, runStatusOf, waitReasonOf } from './run-text.util'

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
    const phases: readonly MissionRunPhase[] = ['building', 'settling', 'probing', 'faulted', 'checking', 'failed']
    for (const phase of phases) {
      expect(waitReasonOf(phase)).not.toBeNull()
    }
    expect(waitReasonOf('ready')).toBeNull()
  })
})

describe('checking', () => {
  it('says the routers are read as they are, and that nothing is undone', () => {
    expect(runStatusOf('checking', [], QUIET, NAMES)?.text).toBe(
      'Checking your work. The routers are read as they are: their daemons, their routes, their configuration. Nothing is undone afterwards.'
    )
  })

  it('says which routers have FRR restarted first, and why', () => {
    expect(runStatusOf('checking', [], { ...QUIET, restartOnCheck: ['a', 'b'] }, NAMES)?.text).toContain(
      'FRR is restarted on routers a and b from the saved configuration, so only what survives a restart counts. Then the routers are read'
    )
  })

  it('knows a mission that has to be asked for its check from one judged by its fault run', () => {
    const route = { id: 'r', text: 'r', check: { kind: 'route', router: 'a', to: '10.255.0.3' } } as const
    const recovery = { id: 'f', text: 'f', check: { kind: 'recovery', via: 'a-b' } } as const
    expect(hasStateChecks({ objectives: [recovery, route] })).toBe(true)
    expect(hasStateChecks({ objectives: [recovery] })).toBe(false)
  })
})

describe('runStatusOf without OSPF', () => {
  it('does not speak of OSPF neighbors where no router runs OSPF', () => {
    expect(runStatusOf('settling', [], QUIET, NAMES)?.text).toBe(
      'The routers are up and FRR is settling on each of them. A few seconds more.'
    )
  })
})
