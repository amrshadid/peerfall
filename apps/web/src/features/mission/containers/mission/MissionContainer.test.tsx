// @vitest-environment jsdom
import { MISSION_FIXTURE } from '@features/mission/utils/fixtures'
import type { UseActiveMissionResult } from '@peerfall/game/hooks'
import type { UseMissionRunResult } from '@peerfall/missions/hooks'
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { MissionContainer, type MissionView } from './MissionContainer'

const MISSION_ID = MISSION_FIXTURE.id

const mocks = vi.hoisted(() => ({
  active: null as unknown,
  run: null as unknown,
  baseline: null as unknown,
  start: vi.fn(),
  begin: vi.fn(),
  leave: vi.fn(),
  startOver: vi.fn(),
  missionRunOf: vi.fn(),
}))

vi.mock('@peerfall/game/hooks', () => ({
  useProgress: () => ({ isOpen: true }),
  useMissionActions: () => ({ start: mocks.start, begin: mocks.begin, leave: mocks.leave }),
  useActiveMission: () => mocks.active,
  useHints: () => ({ objectives: [], reveal: vi.fn() }),
  useRunComparison: () => ({ baseline: mocks.baseline, repaired: null, comparison: null }),
}))
vi.mock('@peerfall/missions/hooks', () => ({
  useMissionRun: (mission: unknown) => {
    mocks.missionRunOf(mission)
    return mocks.run
  },
}))
vi.mock('@peerfall/machine/hooks', () => ({
  useMachineStatus: () => ({ phase: 'ready', detail: null }),
  useRouterSelection: () => ({ router: 'a', select: vi.fn() }),
}))
vi.mock('@features/chrome/hooks/screen', () => ({
  useScreenChrome: () => ({
    themeLabel: 'Night print',
    onToggleTheme: () => {},
    storageIssue: null,
    onExport: null,
    onTour: null,
  }),
}))
vi.mock('@features/chrome/hooks/save', () => ({
  useSaveStatus: () => ({ saveState: 'saved', lastSavedAt: null, storageIssue: null }),
}))
vi.mock('@features/tour/hooks/tour', () => ({ useTourScreen: () => {} }))

// The content on disk changes as missions are written: the screen is tested on a fixed one.
vi.mock('@features/content/hooks/content', async () => {
  const { CONTENT_FIXTURE } = await import('@features/mission/utils/fixtures')
  return { useContent: () => CONTENT_FIXTURE }
})

const mission = MISSION_FIXTURE

const NONE: UseActiveMissionResult = { mission: null, phase: null, verdict: null, record: null, isCompleted: false }

function activeAt(phase: UseActiveMissionResult['phase'], isCompleted = false): UseActiveMissionResult {
  return { mission: mission ?? null, phase, verdict: null, record: null, isCompleted }
}

function runAt(phase: UseMissionRunResult['phase']): UseMissionRunResult {
  return {
    phase,
    errors: [],
    verdict: null,
    checkWork: vi.fn(),
    sendProbe: vi.fn(),
    runFault: vi.fn(),
    startOver: mocks.startOver,
  }
}

function mount(missionId = MISSION_ID) {
  const views: MissionView[] = []
  const rendered = render(
    <MissionContainer
      missionId={missionId}
      guide={(view) => {
        views.push(view)
        return <p>guide slot</p>
      }}
      editor={() => <p>editor slot</p>}
      terminal={<p>terminal slot</p>}
      topology={<p>topology slot</p>}
      timeline={<p>timeline slot</p>}
      debrief={<p>debrief slot</p>}
      notFound={<p>no such page</p>}
    />
  )
  return { ...rendered, lastView: () => views.at(-1) }
}

beforeAll(() => {
  // jsdom has no modal dialogs; the layout only needs them to open and close.
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.open = true
  }
  HTMLDialogElement.prototype.close = function close() {
    this.open = false
  }
})

beforeEach(() => {
  mocks.active = NONE
  mocks.run = runAt('building')
  mocks.baseline = null
  mocks.start.mockResolvedValue({ success: true })
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('MissionContainer', () => {
  it('shows the not-found page for an address that names no mission, and opens nothing', () => {
    mount('no-such-mission')
    expect(screen.getByText('no such page')).toBeTruthy()
    expect(mocks.start).not.toHaveBeenCalled()
  })

  it('opens the mission by its id and draws nothing until the game has it', () => {
    mount()
    expect(mocks.start).toHaveBeenCalledWith(MISSION_ID)
    expect(screen.queryByText('guide slot')).toBeNull()
    expect(mocks.missionRunOf).toHaveBeenLastCalledWith(null)
  })

  it('reads the incident beside the map and the terminal, with the Machine already starting', () => {
    mocks.active = activeAt('incident')
    const { lastView } = mount()
    expect(screen.getByRole('heading', { level: 1, name: 'The Link That Never Went Down' })).toBeTruthy()
    expect(screen.getByText('Stage 4 · Recover from failure')).toBeTruthy()
    expect(screen.getByText('guide slot')).toBeTruthy()
    expect(screen.getByText('terminal slot')).toBeTruthy()
    expect(screen.getByText('topology slot')).toBeTruthy()
    expect(screen.queryByText('timeline slot')).toBeNull()
    expect(screen.queryByText('editor slot')).toBeNull()
    expect(mocks.missionRunOf).toHaveBeenLastCalledWith(mission)
    expect(lastView()).toMatchObject({ step: 'inspect', stepLabel: 'Inspect' })
  })

  it('opens the timeline with the network, and the editor once a baseline is recorded', () => {
    mocks.active = activeAt('play')
    mocks.run = runAt('ready')
    const first = mount()
    expect(screen.getByText('timeline slot')).toBeTruthy()
    expect(screen.queryByText('editor slot')).toBeNull()
    first.unmount()

    mocks.baseline = { role: 'baseline' }
    const { lastView } = mount()
    expect(screen.getByText('editor slot')).toBeTruthy()
    expect(lastView()?.step).toBe('predict')
    expect(screen.getByText('router a')).toBeTruthy()
  })

  it('lays the debrief over the workspace once the player opens it', () => {
    mocks.active = activeAt('play', true)
    const playing = mount()
    expect(screen.queryByText('debrief slot')).toBeNull()
    playing.unmount()

    mocks.active = activeAt('debrief', true)
    mount()
    expect(screen.getByText('debrief slot')).toBeTruthy()
  })

  it('closes the mission when the page is left', () => {
    mocks.active = activeAt('play')
    const { unmount } = mount()
    expect(mocks.leave).not.toHaveBeenCalled()
    unmount()
    expect(mocks.leave).toHaveBeenCalledTimes(1)
  })

  it('says why a mission the game refuses cannot be played', async () => {
    mocks.start.mockResolvedValue({
      success: false,
      error: { code: 'locked', message: 'Finish the mission before it.' },
    })
    mount()
    await act(async () => {})
    expect(screen.getByText('Finish the mission before it.')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Back to the title' })).toBeTruthy()
  })

  it('starts over only after asking, and only while the network is the player’s to use', () => {
    mocks.active = activeAt('play')
    mocks.run = runAt('ready')
    const ready = mount()
    fireEvent.click(screen.getByRole('button', { name: 'Start this mission again' }))
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Start again' }))
    expect(mocks.startOver).toHaveBeenCalledTimes(1)
    ready.unmount()

    mocks.run = runAt('faulted')
    const { lastView } = mount()
    act(() => lastView()?.onStartOver())
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText(/A run is being measured\./)).toBeTruthy()
    expect(within(dialog).queryByRole('button', { name: 'Start again' })).toBeNull()
  })
})
