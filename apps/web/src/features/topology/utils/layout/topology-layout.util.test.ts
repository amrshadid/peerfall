import { describe, expect, it } from 'vitest'
import { BASELINE_EVENTS, HEALTHY_EVENTS } from '@/test/fixtures/machine-events.fixture'
import { PAIR, TRIANGLE } from '@/test/fixtures/network.fixture'
import {
  linkKeyOf,
  linkStatesOf,
  pathLinkKeys,
  pathTextOf,
  routerPositions,
  topologyViewOf,
} from './topology-layout.util'

describe('routerPositions', () => {
  it('puts two routers side by side on the centre line', () => {
    const positions = routerPositions(['a', 'b'])
    expect(positions.get('a')).toEqual({ x: 16, y: 50 })
    expect(positions.get('b')).toEqual({ x: 84, y: 50 })
  })

  it('draws three as a triangle with its point up, centred in the box', () => {
    const positions = routerPositions(['a', 'b', 'c'])
    const a = positions.get('a')
    const b = positions.get('b')
    const c = positions.get('c')
    expect(b?.x).toBe(50)
    expect(a?.y).toBe(c?.y)
    expect(a?.x).toBeLessThan(50)
    expect(c?.x).toBeGreaterThan(50)
    expect(b?.y).toBeLessThan(a?.y ?? 0)
    // What was drawn is centred, not the ring it was drawn on.
    expect(((a?.y ?? 0) + (b?.y ?? 0)) / 2).toBeCloseTo(50, 1)
  })

  it('keeps every router inside the box, whatever their number', () => {
    for (const count of [1, 4, 5, 8]) {
      const names = Array.from({ length: count }, (_, index) => `r${index}`)
      for (const point of routerPositions(names).values()) {
        expect(point.x).toBeGreaterThanOrEqual(10)
        expect(point.x).toBeLessThanOrEqual(90)
        expect(point.y).toBeGreaterThanOrEqual(10)
        expect(point.y).toBeLessThanOrEqual(90)
      }
    }
    expect(routerPositions([]).size).toBe(0)
  })
})

describe('the path', () => {
  it('names a link the same from either end', () => {
    expect(linkKeyOf('c', 'a')).toBe(linkKeyOf('a', 'c'))
  })

  it('takes the links between neighbours on the path, and says the path in order', () => {
    expect([...pathLinkKeys(['a', 'b', 'c'])]).toEqual(['a-b', 'b-c'])
    expect(pathTextOf(['a', 'b', 'c'])).toBe('a → b → c')
  })

  it('has nothing to show for no path, or a single router', () => {
    expect(pathLinkKeys(null).size).toBe(0)
    expect(pathTextOf(null)).toBeNull()
    expect(pathTextOf(['a'])).toBeNull()
  })
})

describe('topologyViewOf', () => {
  it('draws every router and link of the network, links up unless told otherwise', () => {
    const view = topologyViewOf(TRIANGLE, [], null)
    expect(view.routers.map((router) => [router.name, router.loopback])).toEqual([
      ['a', '10.255.0.1'],
      ['b', '10.255.0.2'],
      ['c', '10.255.0.3'],
    ])
    expect(view.links.map((link) => [link.key, link.state, link.onPath])).toEqual([
      ['a-b', 'up', false],
      ['a-c', 'up', false],
      ['b-c', 'up', false],
    ])
    expect(view.pathText).toBeNull()
  })

  it('marks the faulted link and the detour traffic takes round it', () => {
    const view = topologyViewOf(TRIANGLE, [{ link: ['c', 'a'], state: 'dropping' }], ['a', 'b', 'c'])
    expect(view.links.map((link) => [link.key, link.state, link.onPath])).toEqual([
      ['a-b', 'up', true],
      ['a-c', 'dropping', false],
      ['b-c', 'up', true],
    ])
    expect(view.routers.every((router) => router.onPath)).toBe(true)
  })

  it('runs each link between its two routers', () => {
    const view = topologyViewOf(PAIR, [], null)
    expect(view.links[0]).toMatchObject({ from: view.routers[0]?.at, to: view.routers[1]?.at })
  })
})

describe('linkStatesOf', () => {
  it('says a link drops packets from its fault until the fault is cleared', () => {
    expect(linkStatesOf(HEALTHY_EVENTS)).toEqual([])
    expect(linkStatesOf(BASELINE_EVENTS)).toEqual([{ link: ['a', 'c'], state: 'dropping' }])
    const fault = BASELINE_EVENTS.find((event) => event.type === 'fault_injected')
    const cleared = [
      ...BASELINE_EVENTS,
      { type: 'fault_cleared' as const, link: ['a', 'c'] as const, seq: 99, timeMs: (fault?.timeMs ?? 0) + 60_000 },
    ]
    expect(linkStatesOf(cleared)).toEqual([])
  })
})
