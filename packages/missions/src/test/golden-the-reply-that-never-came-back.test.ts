import { describe, expect, it } from 'vitest'
import { goldenMission } from '#test/index'

// Runs recorded on the real Machine by `pnpm vm:golden the-reply-that-never-came-back`. The
// mission's probe was sent before each check, so the events hold what it saw.
const golden = goldenMission('the-reply-that-never-came-back')
const route = (id: string, router: string, prefix: string) =>
  golden.run(id).state?.routers[router]?.routes?.find((candidate) => candidate.prefix === prefix)
const probeReplies = (id: string) => golden.run(id).events.filter((event) => event.type === 'probe_received').length

describe('The Reply That Never Came Back, on the Machine', () => {
  it('has all five golden runs, recorded for this version of the mission', () => {
    expect(golden.runs.map((recorded) => recorded.run).sort()).toEqual([
      'both-ways',
      'default-routes',
      'route-on-a-only',
      'route-on-c-only',
      'start',
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

  it('start: a and c know only their own link, and the probe gets no reply', () => {
    expect(golden.run('start').state?.routers.a?.routes?.map((kernel) => kernel.prefix)).toEqual(['10.0.1.0/30'])
    expect(golden.run('start').state?.routers.c?.routes?.map((kernel) => kernel.prefix)).toEqual(['10.0.2.0/30'])
    expect(probeReplies('start')).toBe(0)
    expect(golden.objectives('start')).toEqual({ 'a-route-to-c': false, 'c-route-back': false, 'a-reaches-c': false })
  })

  it('a route on a only: the packets leave, and no reply comes back', () => {
    expect(route('route-on-a-only', 'a', '10.0.2.0/30')).toEqual({
      prefix: '10.0.2.0/30',
      protocol: 'static',
      nextHops: [{ via: '10.0.1.2', interface: 'a-b' }],
    })
    expect(probeReplies('route-on-a-only')).toBe(0)
    expect(golden.run('route-on-a-only').events.some((event) => event.type === 'probe_lost')).toBe(true)
    expect(golden.objectives('route-on-a-only')).toEqual({
      'a-route-to-c': true,
      'c-route-back': false,
      'a-reaches-c': false,
    })
  })

  it('a route on c only: a still has nowhere to send the packets', () => {
    expect(probeReplies('route-on-c-only')).toBe(0)
    expect(golden.objectives('route-on-c-only')).toEqual({
      'a-route-to-c': false,
      'c-route-back': true,
      'a-reaches-c': false,
    })
  })

  it('a static route each way: both are in the kernels, and the probe and the ping are answered', () => {
    expect(route('both-ways', 'a', '10.0.2.0/30')?.protocol).toBe('static')
    expect(route('both-ways', 'c', '10.0.1.0/30')).toEqual({
      prefix: '10.0.1.0/30',
      protocol: 'static',
      nextHops: [{ via: '10.0.2.1', interface: 'c-b' }],
    })
    expect(probeReplies('both-ways')).toBeGreaterThan(3)
    expect(golden.run('both-ways').state?.pings).toEqual([{ from: 'a', to: '10.0.2.2', sent: 3, received: 3 }])
    expect(golden.objectives('both-ways')).toEqual({ 'a-route-to-c': true, 'c-route-back': true, 'a-reaches-c': true })
  })

  it('default routes pass too: the kernel uses the longest prefix that covers the address', () => {
    expect(route('default-routes', 'a', 'default')?.protocol).toBe('static')
    expect(route('default-routes', 'c', 'default')?.protocol).toBe('static')
    expect(golden.objectives('default-routes')).toEqual({
      'a-route-to-c': true,
      'c-route-back': true,
      'a-reaches-c': true,
    })
  })
})
