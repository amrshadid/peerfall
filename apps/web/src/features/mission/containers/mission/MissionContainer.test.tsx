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
  replay: vi.fn(() => Promise.resolve({ success: true })),
  finished: null as ((count: number, lines?: readonly string[]) => void) | null,
  showDebrief: vi.fn(),
  leave: vi.fn(),
  startOver: vi.fn(() => Promise.resolve()),
  missionRunOf: vi.fn(),
  router: 'a' as string | null,
  select: vi.fn(),
}))

vi.mock('@peerfall/game/hooks', () => ({
  useProgress: () => ({ isOpen: true }),
  useMissionActions: () => ({
    start: mocks.start,
    begin: mocks.begin,
    replay: mocks.replay,
    showDebrief: mocks.showDebrief,
    leave: mocks.leave,
  }),
  useActiveMission: () => mocks.active,
  useHints: () => ({ revealed: [], left: 3, next: 'nudge', reveal: vi.fn() }),
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
  useRouterSelection: () => ({ router: mocks.router, select: mocks.select }),
  useCommandFinished: (callback: (count: number, lines?: readonly string[]) => void) => {
    mocks.finished = callback
  },
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
  const screenOf = () => (
    <MissionContainer
      missionId={missionId}
      guide={(view) => {
        views.push(view)
        return <p>guide slot</p>
      }}
      editor={() => <p>editor slot</p>}
      terminal={() => <p>terminal slot</p>}
      topology={<p>topology slot</p>}
      timeline={<p>timeline slot</p>}
      debrief={(view) => (
        <button type="button" onClick={view.onPlayAgain}>
          debrief slot
        </button>
      )}
      notFound={<p>no such page</p>}
    />
  )
  const rendered = render(screenOf())
  return { ...rendered, lastView: () => views.at(-1), redraw: () => rendered.rerender(screenOf()) }
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
  mocks.router = 'a'
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

  it("puts the terminal in the mission's first router once its routers are built, and not before", () => {
    mocks.active = activeAt('play')
    mocks.router = null
    mocks.run = runAt('building')
    const { rerender } = mount()
    expect(mocks.select).not.toHaveBeenCalled()
    mocks.run = runAt('settling')
    rerender(
      <MissionContainer
        missionId={MISSION_ID}
        guide={() => <p>guide slot</p>}
        editor={() => <p>editor slot</p>}
        terminal={() => <p>terminal slot</p>}
        topology={<p>topology slot</p>}
        timeline={<p>timeline slot</p>}
        debrief={() => <p>debrief slot</p>}
        notFound={<p>no such page</p>}
      />
    )
    expect(mocks.select).toHaveBeenCalledWith('a')
  })

  it('leaves the terminal where it is when a router is already selected', () => {
    mocks.active = activeAt('play')
    mocks.run = runAt('ready')
    mount()
    expect(mocks.select).not.toHaveBeenCalled()
  })

  it('opens the mission by its id and draws nothing until the game has it', () => {
    mount()
    expect(mocks.start).toHaveBeenCalledWith(MISSION_ID)
    expect(screen.queryByText('guide slot')).toBeNull()
    expect(mocks.missionRunOf).toHaveBeenLastCalledWith(null)
  })

  it('tells the scene beside the map and the terminal, with the Machine already starting', () => {
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
    expect(lastView()).toMatchObject({ step: 'scene', reviewing: null })
    act(() => lastView()?.onNext?.())
    expect(mocks.begin).toHaveBeenCalledOnce()
  })

  it('opens the timeline with See it and the editor with Build it', () => {
    mocks.active = activeAt('play')
    mocks.run = runAt('ready')
    const { lastView } = mount()
    expect(lastView()?.step).toBe('see')
    expect(screen.getByText('timeline slot')).toBeTruthy()
    expect(screen.queryByText('editor slot')).toBeNull()
    // See it asks a question: the way on waits for the player's call.
    expect(lastView()?.onNext).toBeNull()
    act(() => lastView()?.pace.pick(0, 1, 2))
    act(() => lastView()?.onNext?.())
    expect(lastView()?.step).toBe('build')
    expect(lastView()?.onNext).toBeNull()
    expect(screen.getByText('editor slot')).toBeTruthy()
    expect(screen.getByText('router a')).toBeTruthy()
  })

  it('offers no way on until the step’s question is answered, "just show me" included', () => {
    mocks.active = activeAt('play')
    mocks.run = runAt('ready')
    const { lastView } = mount()
    expect(lastView()?.onNext).toBeNull()
    act(() => lastView()?.pace.pick(0, null, 3))
    expect(lastView()?.onNext).not.toBeNull()
  })

  it('releases a pause only on the command its beat asked for, a shortened one too', () => {
    mocks.active = activeAt('play')
    mocks.run = runAt('ready')
    const { lastView } = mount()
    expect(lastView()?.pace.shown).toBe(1)
    act(() => mocks.finished?.(1, ['a:~# vtysj']))
    expect(lastView()?.pace.shown).toBe(1)
    act(() => mocks.finished?.(2, ['a:~# vtysh']))
    expect(lastView()?.pace.shown).toBe(2)
  })

  it('releases a pause on any finished command while the Machine does not say what was typed', () => {
    mocks.active = activeAt('play')
    mocks.run = runAt('ready')
    const { lastView } = mount()
    act(() => mocks.finished?.(1))
    expect(lastView()?.pace.shown).toBe(2)
  })

  it('tells the Guide when Build it was reached by skipping See it', () => {
    mocks.active = activeAt('incident')
    const { lastView, redraw } = mount()
    expect(lastView()?.skippedSeeIt).toBe(false)
    act(() => lastView()?.onSkipToBuild?.())
    mocks.active = activeAt('play')
    redraw()
    expect(lastView()).toMatchObject({ step: 'build', skippedSeeIt: true })
  })

  it('moves Build it on to Watch it by itself once every objective is met live', () => {
    mocks.active = activeAt('play')
    mocks.run = { ...runAt('ready'), verdict: { passed: true, objectives: [] } }
    const { lastView } = mount()
    expect(lastView()?.step).toBe('watch')
    act(() => lastView()?.onNext?.())
    expect(mocks.showDebrief).toHaveBeenCalledOnce()
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

  it('puts the terminal back in the first router after starting over', async () => {
    mocks.active = activeAt('play')
    mocks.run = runAt('ready')
    mocks.router = 'b'
    mount()
    fireEvent.click(screen.getByRole('button', { name: 'Start this mission again' }))
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Start again' }))
    await act(async () => {})
    expect(mocks.select).toHaveBeenCalledWith('a')
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

  it('starts over during the scene too, where commands already change the routers', () => {
    mocks.active = activeAt('incident')
    mocks.run = runAt('ready')
    mount()
    fireEvent.click(screen.getByRole('button', { name: 'Start this mission again' }))
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText(/back to how the mission found it\./)).toBeTruthy()
    expect(within(dialog).queryByText(/healthy/)).toBeNull()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Start again' }))
    expect(mocks.startOver).toHaveBeenCalledTimes(1)
  })

  it('ends a look back at a done step from the Guide', () => {
    mocks.active = activeAt('play')
    mocks.run = runAt('ready')
    const { lastView } = mount()
    act(() => lastView()?.pace.pick(0, 1, 2))
    act(() => lastView()?.onNext?.())
    act(() => lastView()?.pace.advance())
    fireEvent.click(screen.getByRole('button', { name: /See it/ }))
    expect(lastView()).toMatchObject({ step: 'build', reviewing: 'see' })
    // Looking back leaves the current step's story where the player was.
    expect(lastView()?.pace.shown).toBe(2)
    act(() => lastView()?.onEndReview())
    expect(lastView()).toMatchObject({ step: 'build', reviewing: null })
  })

  it("replays from the scene on a reset network, as Kernelfall's Replay level, with the saved verdict set aside", () => {
    mocks.active = { ...activeAt('debrief', true), verdict: { passed: true, objectives: [] } }
    mocks.run = runAt('ready')
    const { lastView, redraw } = mount()
    expect(lastView()?.startedOver).toBe(false)
    fireEvent.click(screen.getByRole('button', { name: 'debrief slot' }))
    expect(mocks.startOver).toHaveBeenCalledTimes(1)
    expect(mocks.replay).toHaveBeenCalledTimes(1)
    expect(mocks.begin).not.toHaveBeenCalled()
    // The game reopens the mission at its incident once replay() is called.
    mocks.active = activeAt('incident', true)
    redraw()
    expect(lastView()).toMatchObject({ step: 'scene', reviewing: null, startedOver: true })
    expect(lastView()?.pace.shown).toBe(1)
  })

  it('asks Play it again to wait while a run is being measured', () => {
    mocks.active = activeAt('debrief', true)
    mocks.run = runAt('faulted')
    mount()
    fireEvent.click(screen.getByRole('button', { name: 'debrief slot' }))
    expect(mocks.startOver).not.toHaveBeenCalled()
    expect(mocks.replay).not.toHaveBeenCalled()
    expect(within(screen.getByRole('dialog')).getByText(/A run is being measured\./)).toBeTruthy()
  })
})
