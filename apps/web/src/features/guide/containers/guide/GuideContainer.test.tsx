// @vitest-environment jsdom
import type { GuideStepId } from '@features/guide/types'
import { MISSION_FIXTURE } from '@features/mission/utils/fixtures'
import type { UseActiveMissionResult } from '@peerfall/game/hooks'
import type { RevealedHint } from '@peerfall/game/types'
import type { UseMissionRunResult } from '@peerfall/missions/hooks'
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { GuideContainer } from './GuideContainer'

const mocks = vi.hoisted(() => ({
  active: null as unknown,
  revealed: [] as unknown[],
  reveal: vi.fn(),
  run: vi.fn(),
  finished: null as ((count: number) => void) | null,
}))

vi.mock('@peerfall/game/hooks', () => ({
  useActiveMission: () => mocks.active,
  useHints: () => ({
    revealed: mocks.revealed,
    left: 3 - mocks.revealed.length,
    next: mocks.revealed.length < 3 ? 'nudge' : null,
    reveal: mocks.reveal,
  }),
}))

vi.mock('@peerfall/machine/hooks', () => ({
  useCommandFinished: (callback: (count: number) => void) => {
    mocks.finished = callback
  },
  useMachineStatus: () => ({ phase: 'ready', detail: null }),
  useTerminalCommand: () => ({ run: mocks.run }),
}))

// The content on disk changes as missions are written: the Guide is tested on a fixed one.
vi.mock('@features/content/hooks/content', async () => {
  const { CONTENT_FIXTURE } = await import('@features/mission/utils/fixtures')
  return { useContent: () => CONTENT_FIXTURE }
})

const active = (phase: UseActiveMissionResult['phase']): UseActiveMissionResult => ({
  mission: MISSION_FIXTURE,
  phase,
  verdict: null,
  record: null,
  isCompleted: false,
})

function mount(step: GuideStepId, overrides: { reviewing?: GuideStepId | null; onNext?: () => void } = {}) {
  const props = {
    run: {
      phase: 'ready',
      errors: [],
      verdict: null,
      sendProbe: vi.fn(),
      runFault: vi.fn(),
    } as Pick<UseMissionRunResult, 'phase' | 'errors' | 'verdict' | 'sendProbe' | 'runFault'>,
    step,
    reviewing: overrides.reviewing ?? null,
    onNext: overrides.onNext ?? null,
    onSkipToBuild: step === 'scene' ? vi.fn() : null,
    onStartOver: vi.fn(),
  }
  render(<GuideContainer {...props} />)
  return props
}

beforeEach(() => {
  mocks.active = active('play')
  mocks.revealed = []
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('GuideContainer', () => {
  it('tells the scene first, with the way on and a skip to Build it, and keeps the objectives back', () => {
    mocks.active = active('incident')
    const onNext = vi.fn()
    mount('scene', { onNext })
    expect(screen.getByText(/The racks are quiet/)).toBeTruthy()
    expect(screen.queryByRole('region', { name: /^Objectives/ })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /Next: See it/ }))
    expect(onNext).toHaveBeenCalledOnce()
    expect(screen.getByRole('button', { name: 'Skip to Build it' })).toBeTruthy()
  })

  it('releases a pause when the player finishes a command in the terminal', () => {
    mount('see')
    expect(screen.queryByText(/That is me answering/)).toBeNull()
    act(() => mocks.finished?.(1))
    expect(screen.getByText(/That is me answering/)).toBeTruthy()
  })

  it('runs a chip in the terminal on a click', () => {
    mount('build')
    fireEvent.click(screen.getByRole('button', { name: 'Run show ip ospf neighbor in the terminal' }))
    expect(mocks.run).toHaveBeenCalledWith('show ip ospf neighbor')
  })

  it('has no Check button: objectives are judged live; the run actions stay', () => {
    const props = mount('build')
    expect(screen.queryByRole('button', { name: /Check my work/ })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Send probe' }))
    fireEvent.click(screen.getByRole('button', { name: 'Break the link' }))
    fireEvent.click(screen.getByRole('button', { name: 'Start over' }))
    expect(props.run.sendProbe).toHaveBeenCalledOnce()
    expect(props.run.runFault).toHaveBeenCalledOnce()
    expect(props.onStartOver).toHaveBeenCalledOnce()
    expect(screen.getByText(/Objectives tick on their own/)).toBeTruthy()
  })

  it('reveals the mission hints one at a time, named nudge, concept, spot', () => {
    mount('build')
    fireEvent.click(screen.getByRole('button', { name: 'Show a hint' }))
    expect(mocks.reveal).toHaveBeenCalledOnce()
    cleanup()
    mocks.revealed = MISSION_FIXTURE.hints.map(
      (hint, index): RevealedHint => ({ tier: (['nudge', 'concept', 'spot'] as const)[index] ?? 'spot', ...hint })
    )
    mount('build')
    const hints = screen.getByRole('region', { name: /hints/ })
    expect(within(hints).getByText('Hint 3, the spot')).toBeTruthy()
    expect(within(hints).getByRole('button', { name: 'Copy ip ospf bfd' })).toBeTruthy()
  })

  it("links the mission's Codex cards over the mission, laid open once watching", () => {
    mount('watch')
    const codex = screen.getByRole('region', { name: 'Codex' })
    expect(within(codex).getByRole('link', { name: 'BFD' }).getAttribute('href')).toBe(
      '#/mission/the-link-that-never-went-down?card=bfd'
    )
  })

  it('shows a step looked back at whole, with a note that progress is kept', () => {
    mount('build', { reviewing: 'see' })
    expect(screen.getByText('Looking again at See it. Your progress is kept.')).toBeTruthy()
    expect(screen.getByText(/a router knows its own networks/)).toBeTruthy()
  })

  it('ends the story with the debrief and the real world', () => {
    mocks.active = active('debrief')
    mount('debrief')
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    expect(screen.getByRole('heading', { name: 'In the real world' })).toBeTruthy()
    expect(screen.getByText(/systemctl start frr/)).toBeTruthy()
  })
})
