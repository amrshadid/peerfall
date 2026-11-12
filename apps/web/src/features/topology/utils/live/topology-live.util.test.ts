import { linkStatesOf } from '@features/topology/utils/layout'
import type { MachineEvent, StampedMachineEvent } from '@peerfall/machine/types'
import { describe, expect, it } from 'vitest'
import { TRIANGLE } from '@/test/fixtures/network.fixture'
import { adjacenciesOf, probePathsOf } from './topology-live.util'

const START_MS = 1_760_000_000_000
const PROBE = { from: 'a', destination: '10.255.0.3' }

/** Events in the order given, a millisecond apart: the order things happened in. */
const stamped = (events: readonly MachineEvent[]): StampedMachineEvent[] =>
  events.map((event, seq) => ({ ...event, seq, timeMs: START_MS + seq }) as StampedMachineEvent)

const adjacency = (router: string, peer: string, to: string): MachineEvent => ({
  type: 'ospf_adjacency_change',
  router,
  neighbor: '10.255.0.9',
  address: '10.0.0.9',
  interface: `${router}-${peer}`,
  from: to === 'Full' ? 'Loading' : 'Full',
  to,
  reason: to === 'Full' ? 'LoadingDone' : 'InactivityTimer',
})

const route = (router: string, ...peers: readonly string[]): MachineEvent => ({
  type: 'fib_install',
  router,
  prefix: '10.255.0.3',
  via: '10.0.0.9',
  interface: `${router}-${peers[0]}`,
  nextHops: peers.map((peer) => ({ via: '10.0.0.9', interface: `${router}-${peer}` })),
  protocol: 'ospf',
})

const ALL_FULL: readonly MachineEvent[] = [
  adjacency('a', 'b', 'Full'),
  adjacency('b', 'a', 'Full'),
  adjacency('a', 'c', 'Full'),
  adjacency('c', 'a', 'Full'),
  adjacency('b', 'c', 'Full'),
  adjacency('c', 'b', 'Full'),
]

describe('adjacenciesOf', () => {
  it('knows nothing about a link until one of its routers has reported', () => {
    expect(adjacenciesOf(TRIANGLE, [])).toEqual([
      {
        link: ['a', 'b'],
        ends: [
          { router: 'a', state: null },
          { router: 'b', state: null },
        ],
      },
      {
        link: ['a', 'c'],
        ends: [
          { router: 'a', state: null },
          { router: 'c', state: null },
        ],
      },
      {
        link: ['b', 'c'],
        ends: [
          { router: 'b', state: null },
          { router: 'c', state: null },
        ],
      },
    ])
  })

  it('takes the latest change each end logged for the link', () => {
    const events = stamped([...ALL_FULL, adjacency('c', 'a', 'Deleted')])
    const [, ac] = adjacenciesOf(TRIANGLE, events)
    expect(ac).toEqual({
      link: ['a', 'c'],
      ends: [
        { router: 'a', state: 'Full' },
        { router: 'c', state: 'Deleted' },
      ],
    })
  })

  it('is Full again once the Machine, and its events, went back to before the fault', () => {
    const before = stamped(ALL_FULL)
    const during = stamped([...ALL_FULL, adjacency('a', 'c', 'Deleted'), adjacency('c', 'a', 'Deleted')])
    expect(adjacenciesOf(TRIANGLE, during)[1]?.ends.map((end) => end.state)).toEqual(['Deleted', 'Deleted'])
    expect(adjacenciesOf(TRIANGLE, before)[1]?.ends.map((end) => end.state)).toEqual(['Full', 'Full'])
  })
})

describe('linkStatesOf', () => {
  it('has a link dropping packets from its fault until the fault is cleared, or the events go back', () => {
    const fault: MachineEvent = { type: 'fault_injected', link: ['a', 'c'] }
    const cleared: MachineEvent = { type: 'fault_cleared', link: ['a', 'c'] }
    expect(linkStatesOf(stamped([fault]))).toEqual([{ link: ['a', 'c'], state: 'dropping' }])
    expect(linkStatesOf(stamped([fault, cleared]))).toEqual([])
    expect(linkStatesOf(stamped([fault, cleared, fault]))).toEqual([{ link: ['a', 'c'], state: 'dropping' }])
    expect(linkStatesOf(stamped([]))).toEqual([])
  })
})

describe('probePathsOf', () => {
  it('has no path while the probe’s router has no route', () => {
    expect(probePathsOf(TRIANGLE, PROBE, [])).toEqual([])
  })

  it('follows the route the kernel last installed on the probe’s router', () => {
    expect(probePathsOf(TRIANGLE, PROBE, stamped([route('a', 'c')]))).toEqual([['a', 'c']])
  })

  it('goes on through the next router’s own route after the direct link is given up', () => {
    const events = stamped([route('a', 'c'), route('b', 'c'), route('a', 'b')])
    expect(probePathsOf(TRIANGLE, PROBE, events)).toEqual([['a', 'b', 'c']])
  })

  it('shows two paths when two next hops share the traffic', () => {
    const events = stamped([route('b', 'c'), route('a', 'c', 'b')])
    expect(probePathsOf(TRIANGLE, PROBE, events)).toEqual([
      ['a', 'c'],
      ['a', 'b', 'c'],
    ])
  })

  it('tells the path as far as it is known when the next router has no route yet', () => {
    expect(probePathsOf(TRIANGLE, PROBE, stamped([route('a', 'b')]))).toEqual([['a', 'b']])
  })

  it('stops at a route that points back the way the packet came', () => {
    const events = stamped([route('a', 'b'), route('b', 'a')])
    expect(probePathsOf(TRIANGLE, PROBE, events)).toEqual([['a', 'b']])
  })

  it('has no path again once the route is removed', () => {
    const events = stamped([route('a', 'c'), { type: 'fib_remove', router: 'a', prefix: '10.255.0.3' }])
    expect(probePathsOf(TRIANGLE, PROBE, events)).toEqual([])
  })
})
