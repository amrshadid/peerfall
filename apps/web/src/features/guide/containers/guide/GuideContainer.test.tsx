// @vitest-environment jsdom
import { useGuidePace } from '@features/guide/hooks/pace'
import type { GuidePace, GuideStepId } from '@features/guide/types'
import { MISSION_FIXTURE } from '@features/mission/utils/fixtures'
import type { UseActiveMissionResult } from '@peerfall/game/hooks'
import type { RevealedHint } from '@peerfall/game/types'
import type { UseMissionRunResult } from '@peerfall/missions/hooks'
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { GuideContainer, type GuideContainerProps } from './GuideContainer'

const mocks = vi.hoisted(() => ({
  active: null as unknown,
  revealed: [] as unknown[],
  reveal: vi.fn(),
  run: vi.fn(),
  pace: null as GuidePace | null,
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

function mount(
  step: GuideStepId,
  overrides: {
    reviewing?: GuideStepId | null
    onNext?: () => void
    startedOver?: boolean
    runVerdict?: UseMissionRunResult['verdict']
    skippedSeeIt?: boolean
  } = {}
) {
  const props = {
    run: {
      phase: 'ready',
      errors: [],
      verdict: overrides.runVerdict ?? null,
      sendProbe: vi.fn(),
      runFault: vi.fn(),
    } as Pick<UseMissionRunResult, 'phase' | 'errors' | 'verdict' | 'sendProbe' | 'runFault'>,
    step,
    reviewing: overrides.reviewing ?? null,
    onEndReview: vi.fn(),
    startedOver: overrides.startedOver ?? false,
    onNext: overrides.onNext ?? null,
    onSkipToBuild: step === 'scene' ? vi.fn() : null,
    skippedSeeIt: overrides.skippedSeeIt ?? false,
    onStartOver: vi.fn(),
  }
  render(<Harness {...props} />)
  return props
}

// The screen keeps the pace beside the step; here a harness does.
function Harness(props: Omit<GuideContainerProps, 'pace'>) {
  const pace = useGuidePace(`m#${props.step}`)
  mocks.pace = pace
  return <GuideContainer {...props} pace={pace} />
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

  it('shows the next beat when the screen releases the pause, and offers Continue on every pause', () => {
    mount('see')
    expect(screen.queryByText(/That is me answering/)).toBeNull()
    expect(screen.getByRole('button', { name: 'Continue' })).toBeTruthy()
    act(() => mocks.pace?.advance())
    expect(screen.getByText(/That is me answering/)).toBeTruthy()
  })

  it('opens Build it, after See it was skipped, with how to get where See it ends', () => {
    mount('build', { skippedSeeIt: true })
    expect(screen.getByText(/You skipped See it\. Build it starts where See it ends: type/)).toBeTruthy()
    cleanup()
    mount('build')
    expect(screen.queryByText(/You skipped See it/)).toBeNull()
  })

  it('offers Watch it from Build it when the container gives the way on', () => {
    const onNext = vi.fn()
    mount('build', { onNext })
    fireEvent.click(screen.getByRole('button', { name: /Next: Watch it/ }))
    expect(onNext).toHaveBeenCalledOnce()
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

  it('offers only the way back to the current step while looking back', () => {
    const props = mount('build', { reviewing: 'see' })
    fireEvent.click(screen.getByRole('button', { name: 'Back to Build it' }))
    expect(props.onEndReview).toHaveBeenCalledOnce()
    expect(screen.queryByRole('button', { name: 'Send probe' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Start over' })).toBeNull()
  })

  it('reads objectives from the run alone once the network was started over', () => {
    mocks.active = {
      ...active('play'),
      verdict: {
        passed: false,
        objectives: [
          { objectiveId: 'reaches-c', result: { kind: 'reachable', passed: true, failure: null, replies: 60 } },
        ],
      },
    }
    mount('see')
    expect(screen.getByText('1 of 3 met')).toBeTruthy()
    cleanup()
    mount('see', { startedOver: true })
    expect(screen.getByText('0 of 3 met')).toBeTruthy()
  })

  it('shows the passing verdict beside the debrief, never the fresh network read live after a reload', () => {
    const met = { kind: 'reachable', passed: true, failure: null, replies: 60 } as const
    const unmet = { kind: 'reachable', passed: false, failure: 'unreachable', replies: 0 } as const
    const ids = MISSION_FIXTURE.objectives.map((objective) => objective.id)
    const passed = { passed: true, objectives: ids.map((objectiveId) => ({ objectiveId, result: met })) }
    mocks.active = { ...active('debrief'), verdict: passed }
    const live = { passed: false, objectives: ids.map((objectiveId) => ({ objectiveId, result: unmet })) }
    mount('debrief', { runVerdict: live })
    expect(screen.getByText('3 of 3 met')).toBeTruthy()
    cleanup()
    // Back in play, as after Replay, the live reading takes over.
    mocks.active = { ...active('play'), verdict: passed }
    mount('build', { runVerdict: live })
    expect(screen.getByText('0 of 3 met')).toBeTruthy()
  })

  it('ends the story with the debrief and the real world', () => {
    mocks.active = active('debrief')
    mount('debrief')
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    expect(screen.getByRole('heading', { name: 'In the real world' })).toBeTruthy()
    expect(screen.getByText(/systemctl start frr/)).toBeTruthy()
  })
})
