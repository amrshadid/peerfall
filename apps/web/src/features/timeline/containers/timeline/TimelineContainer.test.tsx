// @vitest-environment jsdom
import type { RunSummary, SavedRun } from '@peerfall/game/types'
import { appContent } from '@peerfall/missions/utils'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { HEALTHY_EVENTS, ONGOING_EVENTS } from '@/test/fixtures/machine-events.fixture'
import { TimelineContainer } from './TimelineContainer'

const mocks = vi.hoisted(() => ({
  mission: null as unknown,
  baseline: null as unknown,
  repaired: null as unknown,
  events: [] as unknown,
}))

vi.mock('@peerfall/game/hooks', () => ({
  useActiveMission: () => ({ mission: mocks.mission }),
  useRunComparison: () => ({ baseline: mocks.baseline, repaired: mocks.repaired, comparison: null }),
}))
vi.mock('@peerfall/machine/hooks', () => ({ useMachineEvents: () => mocks.events }))

const content = appContent()
const mission = content.ok ? content.value.game.mission('the-link-that-never-went-down') : undefined

const HOP = {
  prefix: '10.255.0.3',
  interface: 'a-b',
  via: '10.0.1.2',
  nextHops: [{ via: '10.0.1.2', interface: 'a-b' }],
  protocol: 'ospf',
  atMs: 0,
}

const summary = (detectedBy: 'bfd_session_down' | 'ospf_dead_timer_expired', recoveredMs: number): RunSummary => ({
  faultAtMs: 1000,
  pathBefore: null,
  detection: { event: detectedBy, router: 'c', interface: 'c-a', atMs: 0, afterFaultMs: recoveredMs - 60 },
  adjacencyChange: null,
  routeUpdate: { route: HOP, atMs: 0, afterFaultMs: recoveredMs - 10 },
  firstGoodProbe: { sequence: 9, atMs: 0, afterFaultMs: recoveredMs },
  outage: null,
  repliesBeforeFault: 60,
  probesLost: 12,
})

const saved = (role: SavedRun['role'], run: RunSummary, passed: boolean): SavedRun => ({
  role,
  missionVersion: 1,
  savedAt: 0,
  passed,
  summary: run,
})

const BASELINE = saved('baseline', summary('ospf_dead_timer_expired', 34_940), false)
const REPAIRED = saved('attempt', summary('bfd_session_down', 800), true)

beforeEach(() => {
  mocks.mission = mission
  mocks.baseline = null
  mocks.repaired = null
  mocks.events = HEALTHY_EVENTS
})

afterEach(cleanup)

describe('TimelineContainer', () => {
  it('says no run is recorded before the link was ever broken', () => {
    render(<TimelineContainer />)
    expect(screen.getByText(/No run recorded yet\. A run starts when a link begins to drop packets/)).toBeTruthy()
  })

  it('puts the saved baseline beside the saved repaired run, each with its outage in words', () => {
    mocks.baseline = BASELINE
    mocks.repaired = REPAIRED
    render(<TimelineContainer />)
    expect(screen.getByText('Baseline: traffic was lost for 34.9 s, over the 2.00 s target.')).toBeTruthy()
    expect(screen.getByText('Repaired: traffic was lost for 0.80 s, inside the 2.00 s target.')).toBeTruthy()
    expect(screen.getByText('Repaired recovered 34.1 s sooner than baseline.')).toBeTruthy()
    expect(screen.getByText('OSPF dead timer expired')).toBeTruthy()
    expect(screen.getByText('BFD session down')).toBeTruthy()
    expect(screen.getAllByText('noticed by c on c-a')).toHaveLength(2)
  })

  it('draws a first run live, where the baseline will be', () => {
    mocks.events = ONGOING_EVENTS
    render(<TimelineContainer />)
    expect(screen.getByText('This run: traffic is still being lost.')).toBeTruthy()
    expect(screen.getByRole('img').getAttribute('aria-label')).toBe('This run: traffic is still being lost.')
  })

  it('draws a later run live beside the baseline, and the saved run again once the events have gone back', () => {
    mocks.baseline = BASELINE
    mocks.repaired = REPAIRED
    mocks.events = ONGOING_EVENTS
    const { rerender } = render(<TimelineContainer />)
    expect(screen.getByText('Baseline: traffic was lost for 34.9 s, over the 2.00 s target.')).toBeTruthy()
    expect(screen.getByText('This run: traffic is still being lost.')).toBeTruthy()
    expect(screen.queryByText(/^Repaired:/)).toBeNull()

    mocks.events = HEALTHY_EVENTS
    rerender(<TimelineContainer />)
    expect(screen.queryByText(/^This run:/)).toBeNull()
    expect(screen.getByText('Repaired: traffic was lost for 0.80 s, inside the 2.00 s target.')).toBeTruthy()
  })

  it('explains each moment a run has reached, in plain words', () => {
    mocks.baseline = BASELINE
    render(<TimelineContainer />)
    expect(screen.getByText('What each moment means')).toBeTruthy()
    expect(screen.getByText(/BFD, when it runs on both ends, checks the link several times a second\./)).toBeTruthy()
    // No adjacency change in this run, so that term is not brought up yet.
    expect(screen.queryByText(/OSPF stops treating the two routers as neighbors/)).toBeNull()
  })

  it('draws nothing when no mission is being played', () => {
    mocks.mission = null
    const { container } = render(<TimelineContainer />)
    expect(container.innerHTML).toBe('')
  })
})
