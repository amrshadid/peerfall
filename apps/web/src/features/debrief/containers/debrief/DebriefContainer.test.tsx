// @vitest-environment jsdom
import { CONTENT_FIXTURE, MISSION_FIXTURE } from '@features/mission/utils/fixtures'
import { codexView } from '@peerfall/game/utils'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DebriefContainer } from './DebriefContainer'

const mocks = vi.hoisted(() => ({
  mission: null as unknown,
  repaired: null as unknown,
  codex: null as unknown,
  playAgain: vi.fn(),
  leaveDebrief: vi.fn(() => Promise.resolve()),
}))

vi.mock('@peerfall/game/hooks', () => ({
  useActiveMission: () => ({ mission: mocks.mission, isCompleted: true }),
  useRunComparison: () => ({ baseline: null, repaired: mocks.repaired, comparison: null }),
  useCodex: () => mocks.codex,
  useMissionActions: () => ({ leaveDebrief: mocks.leaveDebrief }),
}))

// The content on disk changes as missions are written: the screen is tested on a fixed one.
vi.mock('@features/content/hooks/content', async () => {
  const { CONTENT_FIXTURE } = await import('@features/mission/utils/fixtures')
  return { useContent: () => CONTENT_FIXTURE }
})

const mission = MISSION_FIXTURE

const COMPLETED = {
  missions: [{ missionId: mission.id, firstStartedAt: 0, completedAt: 1, attempts: 1, hintsRevealed: 0, runs: [] }],
  completionOrder: [mission.id],
  lastActive: mission.id,
}

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
  mocks.codex = codexView(COMPLETED, CONTENT_FIXTURE.game)
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('DebriefContainer', () => {
  it("opens with the debrief's first sentence and the result, with the numbers it rests on", () => {
    render(<DebriefContainer onPlayAgain={mocks.playAgain} />)
    expect(
      screen.getByRole('heading', { level: 2, name: 'You met FRR the way it runs on a real router.' })
    ).toBeTruthy()
    expect(
      screen.getByText('Mission complete · 3 of 3 objectives met · traffic back in 0.80 s, inside 2.00 s')
    ).toBeTruthy()
    expect(screen.getByText('Outage after your change')).toBeTruthy()
  })

  it('names the terms it taught and prints the cards it filed in the Codex', () => {
    render(<DebriefContainer onPlayAgain={mocks.playAgain} />)
    expect(screen.getAllByText('BFD').length).toBeGreaterThan(0)
    const card = screen.getByRole('article', { name: 'BFD' })
    expect(card.querySelector('.pf-man-page__stamp')?.textContent).toBe('FiledCodex · The Link That Never Went Down')
  })

  it('plays the mission again from the start on Replay mission, and leads back to the Peer Map', () => {
    render(<DebriefContainer onPlayAgain={mocks.playAgain} />)
    fireEvent.click(screen.getByRole('button', { name: 'Replay mission' }))
    expect(mocks.playAgain).toHaveBeenCalledTimes(1)
    const map = screen.getByRole('link', { name: 'Back to the map' })
    expect(map.getAttribute('href')).toBe('#/map')
    expect(mocks.leaveDebrief).not.toHaveBeenCalled()
    fireEvent.click(map)
    // Leaving through the debrief closes it, so the mission no longer reopens at it.
    expect(mocks.leaveDebrief).toHaveBeenCalledTimes(1)
  })

  it('draws nothing when no mission is being played', () => {
    mocks.mission = null
    const { container } = render(<DebriefContainer onPlayAgain={mocks.playAgain} />)
    expect(container.innerHTML).toBe('')
  })
})
