// @vitest-environment jsdom
import { MISSION_FIXTURE } from '@features/mission/utils/fixtures'
import type { MachineEvent, StampedMachineEvent } from '@peerfall/machine/types'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TopologyContainer } from './TopologyContainer'

const mocks = vi.hoisted(() => ({
  mission: null as unknown,
  events: [] as unknown,
  interfaces: {} as unknown,
  router: null as string | null,
  select: vi.fn(),
}))

vi.mock('@peerfall/game/hooks', () => ({ useActiveMission: () => ({ mission: mocks.mission }) }))
vi.mock('@peerfall/machine/hooks', () => ({
  useMachineEvents: () => mocks.events,
  useInterfaceStates: () => mocks.interfaces,
  useRouterSelection: () => ({ router: mocks.router, select: mocks.select }),
}))

const mission = MISSION_FIXTURE

const stamped = (events: readonly MachineEvent[]): StampedMachineEvent[] =>
  events.map((event, seq) => ({ ...event, seq, timeMs: 1_760_000_000_000 + seq }) as StampedMachineEvent)

const adjacency = (router: string, peer: string, to: 'Full' | 'Deleted'): MachineEvent => ({
  type: 'ospf_adjacency_change',
  router,
  neighbor: '10.255.0.9',
  address: '10.0.0.9',
  interface: `${router}-${peer}`,
  from: to === 'Full' ? 'Loading' : 'Full',
  to,
  reason: to === 'Full' ? 'LoadingDone' : 'InactivityTimer',
})
const full = (router: string, peer: string): MachineEvent => adjacency(router, peer, 'Full')

const route = (router: string, ...peers: readonly string[]): MachineEvent => ({
  type: 'fib_install',
  router,
  prefix: '10.255.0.3',
  via: '10.0.0.9',
  interface: `${router}-${peers[0]}`,
  nextHops: peers.map((peer) => ({ via: '10.0.0.9', interface: `${router}-${peer}` })),
  protocol: 'ospf',
})

const HEALTHY: readonly MachineEvent[] = [
  full('a', 'b'),
  full('b', 'a'),
  full('a', 'c'),
  full('c', 'a'),
  full('b', 'c'),
  full('c', 'b'),
  route('b', 'c'),
  route('a', 'c'),
]

const linkItem = (name: RegExp) =>
  within(screen.getByRole('list', { name: 'Links' }))
    .getAllByRole('listitem')
    .find((item) => name.test(item.textContent ?? ''))

beforeEach(() => {
  mocks.mission = mission
  mocks.events = stamped(HEALTHY)
  mocks.interfaces = {}
  mocks.router = null
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('TopologyContainer', () => {
  it('draws the mission’s routers and links, healthy, with the probe’s path in words', () => {
    render(<TopologyContainer />)
    expect(screen.getAllByRole('button', { name: /^Router / })).toHaveLength(3)
    expect(linkItem(/Link a to c/)?.textContent).toContain('up')
    expect(linkItem(/Link a to c/)?.textContent).toContain('OSPF Full')
    expect(linkItem(/Link a to c/)?.textContent).toContain('on the path')
    expect(screen.getByText('Probe a → c takes')).toBeTruthy()
    expect(screen.getByText('a → c')).toBeTruthy()
    expect(screen.getByText(/OSPF Full: the two routers on a link are neighbors/)).toBeTruthy()
  })

  it('moves the terminal into the router that is selected, and shows it as selected', () => {
    mocks.router = 'b'
    render(<TopologyContainer />)
    expect(screen.getByRole('button', { name: /^Router b.*the terminal is here/ }).getAttribute('aria-pressed')).toBe(
      'true'
    )
    fireEvent.click(screen.getByRole('button', { name: /^Router a/ }))
    expect(mocks.select).toHaveBeenCalledWith('a')
  })

  it('says in words that the faulted link is dropping packets while its adjacency is still Full', () => {
    mocks.events = stamped([...HEALTHY, { type: 'fault_injected', link: ['a', 'c'] }])
    render(<TopologyContainer />)
    const link = linkItem(/Link a to c/)
    expect(link?.textContent).toContain('dropping packets')
    expect(link?.textContent).toContain('OSPF Full')
    expect(linkItem(/Link a to b/)?.textContent).not.toContain('dropping packets')
  })

  it('says a link is down when the Machine showed one of its ends without carrier', () => {
    mocks.events = []
    mocks.interfaces = {
      a: [
        { name: 'lo', carrier: true },
        { name: 'a-b', carrier: true },
        { name: 'a-c', carrier: false },
      ],
      c: [
        { name: 'lo', carrier: true },
        { name: 'c-a', carrier: false },
        { name: 'c-b', carrier: true },
      ],
    }
    render(<TopologyContainer />)
    expect(linkItem(/Link a to c/)?.textContent).toContain('Link a to c: down')
    expect(linkItem(/Link a to b/)?.textContent).toContain('Link a to b: up')
  })

  it('says the faulted link drops packets while both its ends keep their carrier', () => {
    mocks.events = stamped([...HEALTHY, { type: 'fault_injected', link: ['a', 'c'] }])
    mocks.interfaces = { a: [{ name: 'a-c', carrier: true }], c: [{ name: 'c-a', carrier: true }] }
    render(<TopologyContainer />)
    expect(linkItem(/Link a to c/)?.textContent).toContain('dropping packets')
  })

  it('shows the adjacency lost and the path through b once the routers have noticed', () => {
    mocks.events = stamped([
      ...HEALTHY,
      { type: 'fault_injected', link: ['a', 'c'] },
      adjacency('c', 'a', 'Deleted'),
      route('a', 'b'),
    ])
    render(<TopologyContainer />)
    const link = linkItem(/Link a to c/)
    expect(link?.textContent).toContain('OSPF lost')
    expect(link?.textContent).toContain('a sees c as Full, c sees a as Deleted')
    expect(screen.getByText('a → b → c')).toBeTruthy()
  })

  it('says when two equal routes share the traffic', () => {
    mocks.events = stamped([...HEALTHY, route('a', 'c', 'b')])
    render(<TopologyContainer />)
    expect(screen.getByText('a → c and a → b → c')).toBeTruthy()
    expect(screen.getByText('(traffic is shared over these)')).toBeTruthy()
  })

  it('says there is no path before any route is known, and draws nothing without a mission', () => {
    mocks.events = []
    const first = render(<TopologyContainer />)
    expect(screen.getByText('Probe a → c takes: no path')).toBeTruthy()
    first.unmount()

    mocks.mission = null
    const { container } = render(<TopologyContainer />)
    expect(container.innerHTML).toBe('')
  })
})
