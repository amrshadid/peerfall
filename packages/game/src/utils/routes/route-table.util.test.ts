import { describe, expect, it } from 'vitest'
import { FAULT_AT_MS, stamped } from '#test/index'
import { forwardsOnlyThrough, ipv4ToNumber, routeAt, routeChanges } from '#utils/routes/route-table.util'

const install = (router: string, prefix: string, via: string | null, dev: string, atMs: number) =>
  ({
    type: 'fib_install',
    router,
    prefix,
    via,
    interface: dev,
    nextHops: [{ via, interface: dev }],
    protocol: 'ospf',
    atMs,
  }) as const

describe('ipv4ToNumber', () => {
  it('reads dotted addresses and refuses anything else', () => {
    expect(ipv4ToNumber('10.255.0.3')).toBe(0x0aff0003)
    expect(ipv4ToNumber('255.255.255.255')).toBe(0xffffffff)
    expect(ipv4ToNumber('10.0.0.256')).toBeNull()
    expect(ipv4ToNumber('10.0.0')).toBeNull()
  })
})

describe('routeChanges', () => {
  it('follows the longest prefix that covers the destination, as the kernel does', () => {
    const changes = routeChanges(
      stamped([
        install('a', 'default', '10.0.1.2', 'a-b', 0),
        install('a', '10.255.0.0/24', '10.0.1.2', 'a-b', 10),
        install('a', '10.255.0.3', '10.0.2.2', 'a-c', 20),
        install('a', '10.9.0.0/16', '10.0.1.2', 'a-b', 30),
        { type: 'fib_remove', router: 'a', prefix: '10.255.0.3', atMs: 40 },
      ]),
      'a',
      '10.255.0.3'
    )
    expect(changes.map((change) => [change.atMs - FAULT_AT_MS, change.route?.prefix])).toEqual([
      [0, 'default'],
      [10, '10.255.0.0/24'],
      [20, '10.255.0.3'],
      [40, '10.255.0.0/24'],
    ])
  })

  it("keeps each router's table apart and reports a router left with no route", () => {
    const events = stamped([
      install('c', '10.255.0.3', null, 'lo', 0),
      install('a', '10.255.0.3', '10.0.2.2', 'a-c', 5),
      { type: 'fib_remove', router: 'a', prefix: '10.255.0.3', atMs: 9 },
    ])
    const changes = routeChanges(events, 'a', '10.255.0.3')
    expect(changes.map((change) => change.route?.interface ?? null)).toEqual(['a-c', null])
    expect(routeAt(changes, FAULT_AT_MS + 4)).toBeNull()
    expect(routeAt(changes, FAULT_AT_MS + 5)?.interface).toBe('a-c')
    expect(routeAt(changes, FAULT_AT_MS + 9)).toBeNull()
  })

  it('reads events by their time, not by the order they arrived in', () => {
    const [first, second] = stamped([
      install('a', '10.255.0.3', '10.0.2.2', 'a-c', 0),
      install('a', '10.255.0.3', '10.0.1.2', 'a-b', 10),
    ])
    const changes = routeChanges(
      [second, first].flatMap((event) => (event ? [event] : [])),
      'a',
      '10.255.0.3'
    )
    expect(changes.map((change) => change.route?.interface)).toEqual(['a-c', 'a-b'])
  })

  it('sees a next hop joining a route as a change', () => {
    const changes = routeChanges(
      stamped([
        install('a', '10.255.0.3', '10.0.2.2', 'a-c', 0),
        {
          ...install('a', '10.255.0.3', '10.0.2.2', 'a-c', 10),
          nextHops: [
            { via: '10.0.2.2', interface: 'a-c' },
            { via: '10.0.1.2', interface: 'a-b' },
          ],
        },
      ]),
      'a',
      '10.255.0.3'
    )
    expect(changes).toHaveLength(2)
    expect(forwardsOnlyThrough(changes[0]?.route ?? null, 'a-c')).toBe(true)
    expect(forwardsOnlyThrough(changes[1]?.route ?? null, 'a-c')).toBe(false)
    expect(forwardsOnlyThrough(null, 'a-c')).toBe(false)
  })

  it('has nothing to say about a destination that is not an address', () => {
    expect(routeChanges(stamped([install('a', 'default', '10.0.1.2', 'a-b', 0)]), 'a', 'c')).toEqual([])
  })
})
