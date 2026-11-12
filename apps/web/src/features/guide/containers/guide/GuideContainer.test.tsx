// @vitest-environment jsdom
import { MISSION_FIXTURE } from '@features/mission/utils/fixtures'
import type { ObjectiveHints, UseActiveMissionResult } from '@peerfall/game/hooks'
import type { MissionDefinition, MissionVerdict } from '@peerfall/game/types'
import type { UseMissionRunResult } from '@peerfall/missions/hooks'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { GuideContainer } from './GuideContainer'

const mocks = vi.hoisted(() => ({
  active: null as unknown,
  hints: [] as unknown,
  begin: vi.fn(),
  showDebrief: vi.fn(),
  reveal: vi.fn(),
}))

vi.mock('@peerfall/game/hooks', () => ({
  useActiveMission: () => mocks.active,
  useHints: () => ({ objectives: mocks.hints, reveal: mocks.reveal }),
  useMissionActions: () => ({ begin: mocks.begin, showDebrief: mocks.showDebrief }),
}))

// The content on disk changes as missions are written: the Guide is tested on a fixed one.
vi.mock('@features/content/hooks/content', async () => {
  const { CONTENT_FIXTURE } = await import('@features/mission/utils/fixtures')
  return { useContent: () => CONTENT_FIXTURE }
})

const mission = MISSION_FIXTURE

const hintsOf = (shown: readonly number[]): readonly ObjectiveHints[] =>
  mission.objectives.map((objective, index) => ({
    objective,
    revealed: objective.hints.slice(0, shown[index] ?? 0),
    left: objective.hints.length - (shown[index] ?? 0),
  }))

const activeAt = (phase: UseActiveMissionResult['phase'], isCompleted = false): UseActiveMissionResult => ({
  mission,
  phase,
  verdict: null,
  record: null,
  isCompleted,
})

const PROBED: MissionVerdict = {
  passed: false,
  objectives: [
    { objectiveId: 'reaches-c', result: { kind: 'reachable', passed: true, failure: null, replies: 60 } },
    {
      objectiveId: 'direct-while-healthy',
      result: { kind: 'path', passed: false, failure: 'no_route', before: null, after: null },
    },
    {
      objectiveId: 'recovers-through-b',
      result: { kind: 'recovery', passed: false, failure: 'no_fault', recovery: null, limitMs: 2000 },
    },
  ],
}

function mount(run: Partial<UseMissionRunResult> = {}) {
  const props = {
    run: {
      phase: 'ready',
      errors: [],
      verdict: null,
      checkWork: vi.fn(),
      sendProbe: vi.fn(),
      runFault: vi.fn(),
      ...run,
    } as const,
    onStartOver: vi.fn(),
  }
  render(<GuideContainer run={props.run} step="inspect" stepLabel="Inspect" onStartOver={props.onStartOver} />)
  return props
}

const button = (name: string | RegExp) => screen.getByRole('button', { name })

beforeEach(() => {
  mocks.active = activeAt('play')
  mocks.hints = hintsOf([])
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('GuideContainer', () => {
  it('opens on the incident alone, with Begin as the way on', () => {
    mocks.active = activeAt('incident')
    mount({ phase: 'building' })
    expect(screen.getByRole('heading', { name: 'Incident: traffic to c stopped for half a minute' })).toBeTruthy()
    expect(screen.getByText(/The direct link between a and c never went down\./)).toBeTruthy()
    expect(screen.queryByRole('region', { name: /^Objectives/ })).toBeNull()
    expect(screen.queryByRole('button', { name: /Send probe/ })).toBeNull()
    // The Machine is already starting while the report is read.
    expect(screen.getByRole('status').textContent).toContain('Starting the routers… about a minute the first time.')
    fireEvent.click(button(/^Begin/))
    expect(mocks.begin).toHaveBeenCalledTimes(1)
  })

  it('lists the objectives open and offers the three actions once the network is ready', () => {
    const { run, onStartOver } = mount()
    const objectives = screen.getByRole('region', { name: /^Objectives/ })
    expect(within(objectives).getByText('0 of 3 met')).toBeTruthy()
    fireEvent.click(button('Send probe'))
    fireEvent.click(button('Break the link'))
    fireEvent.click(button('Start over'))
    expect(run.sendProbe).toHaveBeenCalledTimes(1)
    expect(run.runFault).toHaveBeenCalledTimes(1)
    expect(onStartOver).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('button', { name: /Read the debrief/ })).toBeNull()
  })

  it.each([
    ['building', 'The routers are still starting.'],
    ['settling', 'The routers are still starting.'],
    ['probing', 'A probe is being sent.'],
    ['faulted', 'A run is being measured.'],
  ] as const)('holds the actions back while the run is %s, and says why', (phase, reason) => {
    const { run, onStartOver } = mount({ phase })
    for (const name of ['Send probe', 'Break the link', 'Start over']) {
      const action = button(new RegExp(`^${name}`))
      expect(action.getAttribute('aria-disabled')).toBe('true')
      expect(action.getAttribute('title')).toBe(reason)
      fireEvent.click(action)
    }
    expect(run.sendProbe).not.toHaveBeenCalled()
    expect(run.runFault).not.toHaveBeenCalled()
    expect(onStartOver).not.toHaveBeenCalled()
    expect(screen.getAllByRole('status').some((status) => status.getAttribute('aria-busy') === 'true')).toBe(true)
  })

  it('ticks objectives from the run’s verdict and words each failure for a beginner', () => {
    mount({ verdict: PROBED })
    const objectives = screen.getByRole('region', { name: /^Objectives/ })
    expect(within(objectives).getByText('1 of 3 met')).toBeTruthy()
    expect(within(objectives).getByText(/Last run: 60 replies came back from 10\.255\.0\.3\./)).toBeTruthy()
    expect(within(objectives).getByText(/a had no route to 10\.255\.0\.3 when it needed one\./)).toBeTruthy()
    expect(
      within(objectives).getByText(/the link was not broken, and this is judged only when it breaks\./)
    ).toBeTruthy()
  })

  it('falls back to the last attempt’s verdict when this page has not run anything yet', () => {
    mocks.active = { ...activeAt('play'), verdict: PROBED }
    mount()
    expect(screen.getByText('1 of 3 met')).toBeTruthy()
  })

  it('reveals one hint at a time, for the first objective still open', () => {
    mocks.hints = hintsOf([2, 0, 0])
    mount({ verdict: PROBED })
    const hints = screen.getByRole('region', { name: /^Hints/ })
    expect(within(hints).getByText('5 left')).toBeTruthy()
    expect(within(hints).getAllByRole('listitem')).toHaveLength(2)
    fireEvent.click(within(hints).getByRole('button', { name: 'Show the next hint' }))
    expect(mocks.reveal).toHaveBeenCalledWith('direct-while-healthy')
  })

  it('shows a hint’s command as code that can be copied', () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    mocks.hints = hintsOf([2, 0, 0])
    mount()
    expect(screen.getByText('ping -c 3 10.255.0.3').tagName).toBe('CODE')
    fireEvent.click(button('Copy ping -c 3 10.255.0.3'))
    expect(writeText).toHaveBeenCalledWith('ping -c 3 10.255.0.3')
    expect(button('Copy ping -c 3 10.255.0.3').textContent).toBe('Copied')
  })

  it('offers the debrief once the mission has passed', () => {
    mocks.active = activeAt('play', true)
    mount()
    fireEvent.click(button(/^Read the debrief/))
    expect(mocks.showDebrief).toHaveBeenCalledTimes(1)
  })

  it('gives the Machine’s own words when the network could not be built', () => {
    mount({ phase: 'failed', errors: ['ip link add: exit 2'] })
    const alert = screen.getByRole('alert')
    expect(alert.textContent).toContain('The network could not be started.')
    expect(alert.textContent).toContain('ip link add: exit 2')
  })

  it('does not offer a check on a mission that is judged by its fault run', () => {
    mount()
    expect(screen.queryByRole('button', { name: /Check my work/ })).toBeNull()
  })

  it('offers Check my work, and nothing to send or break, where the routers are read as they are', () => {
    // The first mission without its traffic and its fault, asked for a route instead.
    const { fault: _fault, probe: _probe, recoveryTargetMs: _target, ...rest } = mission
    const quiet: MissionDefinition = {
      ...rest,
      restartOnCheck: ['a'],
      objectives: [
        {
          id: 'route-to-c',
          text: 'Give a a route to c.',
          check: { kind: 'route', router: 'a', to: '10.255.0.3' },
          hints: [
            { text: 'Look at the routing table.' },
            { text: 'Add it.', command: 'ip route 10.255.0.3/32 10.0.2.2' },
          ],
        },
      ],
    }
    mocks.active = { ...activeAt('play'), mission: quiet }
    mocks.hints = []
    const { run } = mount()
    expect(screen.queryByRole('button', { name: /Send probe/ })).toBeNull()
    expect(screen.queryByRole('button', { name: /Break the link/ })).toBeNull()
    expect(screen.getByText(/reads the routers as they are and ticks what is met/)).toBeTruthy()
    fireEvent.click(button('Check my work'))
    expect(run.checkWork).toHaveBeenCalledTimes(1)
    cleanup()

    mount({ phase: 'checking' })
    expect(button(/^Check my work/).getAttribute('title')).toBe('Your work is being checked.')
    const status = screen.getAllByRole('status').find((each) => each.getAttribute('aria-busy') === 'true')
    expect(status?.textContent).toContain('FRR is restarted on router a from the saved configuration')
  })

  it('draws nothing when no mission is being played', () => {
    mocks.active = { mission: null, phase: null, verdict: null, record: null, isCompleted: false }
    const { container } = render(
      <GuideContainer
        run={{
          phase: 'building',
          errors: [],
          verdict: null,
          checkWork: vi.fn(),
          sendProbe: vi.fn(),
          runFault: vi.fn(),
        }}
        step="inspect"
        stepLabel="Inspect"
        onStartOver={vi.fn()}
      />
    )
    expect(container.innerHTML).toBe('')
  })
})
