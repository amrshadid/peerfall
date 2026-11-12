// @vitest-environment jsdom
import { MISSION_FIXTURE } from '@features/mission/utils/fixtures'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DebriefContainer } from './DebriefContainer'

const mocks = vi.hoisted(() => ({
  mission: null as unknown,
  repaired: null as unknown,
  begin: vi.fn(),
}))

vi.mock('@peerfall/game/hooks', () => ({
  useActiveMission: () => ({ mission: mocks.mission, isCompleted: true }),
  useRunComparison: () => ({ baseline: null, repaired: mocks.repaired, comparison: null }),
  useMissionActions: () => ({ begin: mocks.begin }),
}))

// The content on disk changes as missions are written: the screen is tested on a fixed one.
vi.mock('@features/content/hooks/content', async () => {
  const { CONTENT_FIXTURE } = await import('@features/mission/utils/fixtures')
  return { useContent: () => CONTENT_FIXTURE }
})

const mission = MISSION_FIXTURE

const REPAIRED = {
  role: 'attempt',
  missionVersion: 1,
  savedAt: 0,
  passed: true,
  summary: {
    faultAtMs: 1000,
    pathBefore: null,
    detection: null,
    adjacencyChange: null,
    routeUpdate: null,
    firstGoodProbe: { sequence: 76, atMs: 1796, afterFaultMs: 796 },
    outage: null,
    repliesBeforeFault: 60,
    probesLost: 12,
  },
}

beforeEach(() => {
  mocks.mission = mission
  mocks.repaired = REPAIRED
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('DebriefContainer', () => {
  it('opens with the verdict and the numbers it rests on', () => {
    render(<DebriefContainer />)
    expect(screen.getByRole('heading', { level: 2, name: 'The Link That Never Went Down' })).toBeTruthy()
    expect(screen.getByText('Passed: traffic was back in 0.80 s, inside the 2.00 s target.')).toBeTruthy()
    expect(screen.getByText('Outage after your change')).toBeTruthy()
  })

  it('prints the mission’s own debrief, its sections and the commands to repeat on real FRR', () => {
    const { container } = render(<DebriefContainer />)
    expect(screen.getByRole('heading', { level: 3, name: 'Why the interfaces stayed up' })).toBeTruthy()
    expect(screen.getByRole('heading', { level: 3, name: 'Try it on real FRR' })).toBeTruthy()
    expect(screen.getByText('BFD').tagName).toBe('B')
    expect(container.querySelector('pre')?.textContent).toContain('show ip ospf neighbor\n')
    // The file's own title would only repeat the mission's name.
    expect(screen.queryByText('Debrief: the link that never went down')).toBeNull()
  })

  it('goes back to the network on Play it again', () => {
    render(<DebriefContainer />)
    fireEvent.click(screen.getByRole('button', { name: 'Play it again' }))
    expect(mocks.begin).toHaveBeenCalledTimes(1)
  })

  it('draws nothing when no mission is being played', () => {
    mocks.mission = null
    const { container } = render(<DebriefContainer />)
    expect(container.innerHTML).toBe('')
  })
})
