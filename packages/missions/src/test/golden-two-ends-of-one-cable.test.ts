import { describe, expect, it } from 'vitest'
import { goldenMission } from '#test/index'

// Runs recorded on the real Machine by `pnpm vm:golden two-ends-of-one-cable`, judged again here
// by the mission's own checks from each kernel's routing table and a ping.
const golden = goldenMission('two-ends-of-one-cable')
const routes = (id: string, router: string) => golden.run(id).state?.routers[router]?.routes ?? []
const replies = (id: string) => golden.run(id).state?.pings[0]?.received

describe('Two Ends of One Cable, on the Machine', () => {
  it('has all five golden runs, recorded for this version of the mission', () => {
    expect(golden.runs.map((recorded) => recorded.run).sort()).toEqual([
      'addressed-from-linux',
      'both-ends',
      'one-end',
      'start',
      'two-networks',
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

  it('start: neither kernel has a route, a sends nothing, and the mission is not passed', () => {
    expect(routes('start', 'a')).toEqual([])
    expect(routes('start', 'b')).toEqual([])
    expect(replies('start')).toBe(0)
    expect(golden.objectives('start')).toEqual({ 'a-connected': false, 'b-connected': false, 'a-reaches-b': false })
  })

  it('one end only: a has its connected route, and nobody answers', () => {
    expect(routes('one-end', 'a')).toEqual([
      { prefix: '10.0.1.0/30', protocol: 'kernel', nextHops: [{ via: null, interface: 'a-b' }] },
    ])
    expect(replies('one-end')).toBe(0)
    expect(golden.objectives('one-end')).toEqual({ 'a-connected': true, 'b-connected': false, 'a-reaches-b': false })
  })

  it('two different networks: each end has a connected route, and they do not reach each other', () => {
    expect(routes('two-networks', 'b').map((route) => route.prefix)).toEqual(['10.0.2.0/30'])
    expect(replies('two-networks')).toBe(0)
    expect(golden.objectives('two-networks')).toEqual({
      'a-connected': true,
      'b-connected': false,
      'a-reaches-b': false,
    })
  })

  it('both ends in one network: the connected route in each kernel, and every packet answered', () => {
    for (const id of ['both-ends', 'addressed-from-linux']) {
      expect(routes(id, 'a')).toEqual([
        { prefix: '10.0.1.0/30', protocol: 'kernel', nextHops: [{ via: null, interface: 'a-b' }] },
      ])
      expect(routes(id, 'b')).toEqual([
        { prefix: '10.0.1.0/30', protocol: 'kernel', nextHops: [{ via: null, interface: 'b-a' }] },
      ])
      expect(replies(id)).toBe(3)
      expect(golden.objectives(id)).toEqual({ 'a-connected': true, 'b-connected': true, 'a-reaches-b': true })
    }
  })
})
