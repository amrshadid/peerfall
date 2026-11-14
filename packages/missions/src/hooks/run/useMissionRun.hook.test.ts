// @vitest-environment jsdom
import type { MissionDefinition, MissionVerdict } from '@peerfall/game/types'
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const PASSED: MissionVerdict = { passed: true, objectives: [] }
const FELL_SHORT: MissionVerdict = { passed: false, objectives: [] }

const game = vi.hoisted(() => ({
  verdict: null as MissionVerdict | null,
  submitRun: vi.fn(async () => ({ success: true })),
  saveBaseline: vi.fn(async () => ({ success: true })),
  baseline: null as unknown,
}))

const tab = vi.hoisted(() => ({ duringRun: () => {} }))

/** jsdom's tab is always visible; this one can be switched away from. */
function setVisibility(state: DocumentVisibilityState) {
  Object.defineProperty(document, 'visibilityState', { value: state, configurable: true })
  document.dispatchEvent(new Event('visibilitychange'))
}

vi.mock('@peerfall/game/hooks', () => ({
  createMissionActions: () => ({
    judge: () => ({ success: true, data: game.verdict }),
    submitRun: game.submitRun,
    saveBaseline: game.saveBaseline,
  }),
  useRunComparison: () => ({ baseline: game.baseline, repaired: null, comparison: null }),
}))
vi.mock('@peerfall/game/utils', () => ({ stateRequestOf: () => ({ routers: {}, pings: [] }) }))
vi.mock('@peerfall/machine/hooks', () => ({
  useNetwork: () => ({ phase: 'ready', errors: [] }),
  useCommandFinished: () => {},
}))
vi.mock('@peerfall/machine/services', () => ({
  readVmMachineState: vi.fn(),
  restartVmFrr: vi.fn(),
  restoreVmHealthy: vi.fn(async () => true),
  saveVmHealthy: vi.fn(async () => true),
  setVmFault: vi.fn(),
  startVmProbe: vi.fn(),
  stopVmProbe: vi.fn(),
}))
vi.mock('#utils/run/mission-run.util', () => ({
  START_SLOT: 'start',
  checkRun: vi.fn(),
  probeRun: vi.fn(),
  waitUntilSettled: async () => true,
  routingChangeCount: () => 0,
  faultRun: async () => {
    // What happens in the browser while the link is broken.
    tab.duringRun()
    return { ok: true, events: [] }
  },
  liveRead: async () => ({ ok: true, events: [], state: { routers: {}, pings: [] } }),
}))

const { useMissionRun } = await import('#hooks/run/useMissionRun.hook')

const MISSION = { id: 'a-mission', version: 1, network: { routers: [], links: [] } } as unknown as MissionDefinition

/** Long enough for the live judging a command or a run asks for. */
const quiet = () => act(() => new Promise((resolve) => setTimeout(resolve, 600)))

async function readyRun() {
  const hook = renderHook(() => useMissionRun(MISSION))
  await waitFor(() => expect(hook.result.current.phase).toBe('ready'))
  await quiet()
  return hook
}

describe('the attempts a mission records', () => {
  afterEach(() => {
    cleanup()
    game.submitRun.mockClear()
    game.saveBaseline.mockClear()
    game.baseline = null
    game.verdict = null
  })

  it('records nothing while live judging finds objectives unmet', async () => {
    game.verdict = FELL_SHORT
    await readyRun()
    expect(game.submitRun).not.toHaveBeenCalled()
  })

  it('records the pass live judging finds once per play-through', async () => {
    game.verdict = PASSED
    const { result } = await readyRun()
    expect(game.submitRun).toHaveBeenCalledOnce()

    await act(() => result.current.startOver())
    await quiet()
    expect(game.submitRun).toHaveBeenCalledTimes(2)
  })

  it('records a passing fault run once, not again when live judging reads the network after it', async () => {
    game.verdict = FELL_SHORT
    game.baseline = { role: 'baseline' }
    const { result } = await readyRun()

    game.verdict = PASSED
    await act(() => result.current.runFault())
    await quiet()

    expect(game.submitRun).toHaveBeenCalledOnce()
  })

  it('keeps the first fault run that falls short as the baseline, which is no attempt', async () => {
    game.verdict = FELL_SHORT
    const { result } = await readyRun()

    await act(() => result.current.runFault())
    expect(game.saveBaseline).toHaveBeenCalledOnce()
    expect(game.submitRun).not.toHaveBeenCalled()
  })

  it('records a fault run that falls short after the baseline, as Kernelfall counts a failed check', async () => {
    game.verdict = FELL_SHORT
    game.baseline = { role: 'baseline' }
    const { result } = await readyRun()

    await act(() => result.current.runFault())
    expect(game.submitRun).toHaveBeenCalledOnce()
  })
})

describe('a fault run the tab was hidden for', () => {
  afterEach(() => {
    cleanup()
    game.submitRun.mockClear()
    game.saveBaseline.mockClear()
    game.baseline = null
    game.verdict = null
    tab.duringRun = () => {}
    setVisibility('visible')
  })

  it('is not judged: no verdict, no baseline, no attempt, and it says why', async () => {
    game.verdict = null
    const { result } = await readyRun()

    game.verdict = PASSED
    tab.duringRun = () => {
      setVisibility('hidden')
      setVisibility('visible')
    }
    await act(() => result.current.runFault())

    expect(result.current.voided?.reason).toBe('hidden')
    expect(result.current.verdict).toBeNull()
    expect(game.saveBaseline).not.toHaveBeenCalled()
    expect(game.submitRun).not.toHaveBeenCalled()
  })

  it('is not judged when it ends with the tab still hidden', async () => {
    game.verdict = FELL_SHORT
    const { result } = await readyRun()

    tab.duringRun = () => setVisibility('hidden')
    await act(() => result.current.runFault())

    expect(result.current.voided?.reason).toBe('hidden')
    expect(game.saveBaseline).not.toHaveBeenCalled()
  })

  it('leaves the next run, made with the tab in front, to be judged as usual', async () => {
    game.verdict = FELL_SHORT
    const { result } = await readyRun()
    tab.duringRun = () => {
      setVisibility('hidden')
      setVisibility('visible')
    }
    await act(() => result.current.runFault())
    expect(result.current.voided).not.toBeNull()

    tab.duringRun = () => {}
    await act(() => result.current.runFault())
    expect(result.current.voided).toBeNull()
    expect(game.saveBaseline).toHaveBeenCalledOnce()
  })

  it('voids nothing when the tab was hidden while no run was going on', async () => {
    game.verdict = FELL_SHORT
    const { result } = await readyRun()
    setVisibility('hidden')
    setVisibility('visible')

    await act(() => result.current.runFault())
    expect(result.current.voided).toBeNull()
    expect(game.saveBaseline).toHaveBeenCalledOnce()
  })

  it('is forgotten on Start over', async () => {
    game.verdict = FELL_SHORT
    const { result } = await readyRun()
    tab.duringRun = () => {
      setVisibility('hidden')
      setVisibility('visible')
    }
    await act(() => result.current.runFault())
    expect(result.current.voided).not.toBeNull()

    await act(() => result.current.startOver())
    expect(result.current.voided).toBeNull()
  })
})
