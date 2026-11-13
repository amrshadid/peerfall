// @vitest-environment jsdom
import { MISSION_FIXTURE } from '@features/mission/utils/fixtures'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DebriefContainer } from './DebriefContainer'

const mocks = vi.hoisted(() => ({
  mission: null as unknown,
  repaired: null as unknown,
  playAgain: vi.fn(),
}))

vi.mock('@peerfall/game/hooks', () => ({
  useActiveMission: () => ({ mission: mocks.mission, isCompleted: true }),
  useRunComparison: () => ({ baseline: null, repaired: mocks.repaired, comparison: null }),
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
    render(<DebriefContainer onPlayAgain={mocks.playAgain} />)
    expect(screen.getByRole('heading', { level: 2, name: 'The Link That Never Went Down' })).toBeTruthy()
    expect(screen.getByText('Passed: traffic was back in 0.80 s, inside the 2.00 s target.')).toBeTruthy()
    expect(screen.getByText('Outage after your change')).toBeTruthy()
  })

  it('names the terms the mission filed in the Codex; the story tells the debrief in the Guide', () => {
    render(<DebriefContainer onPlayAgain={mocks.playAgain} />)
    expect(screen.getByText('BFD')).toBeTruthy()
    expect(screen.queryByRole('heading', { name: 'Try it on real FRR' })).toBeNull()
  })

  it('plays the mission again from the start on Play it again', () => {
    render(<DebriefContainer onPlayAgain={mocks.playAgain} />)
    fireEvent.click(screen.getByRole('button', { name: 'Play it again' }))
    expect(mocks.playAgain).toHaveBeenCalledTimes(1)
  })

  it('draws nothing when no mission is being played', () => {
    mocks.mission = null
    const { container } = render(<DebriefContainer onPlayAgain={mocks.playAgain} />)
    expect(container.innerHTML).toBe('')
  })
})
