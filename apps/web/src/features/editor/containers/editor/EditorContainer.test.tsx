// @vitest-environment jsdom
import type { CodeEditorPresentationProps } from '@features/editor/components/editor'
import { MISSION_FIXTURE } from '@features/mission/utils/fixtures'
import type { VmStatus } from '@peerfall/machine/types'
import { act, cleanup, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { EditorContainer } from './EditorContainer'

const mocks = vi.hoisted(() => ({
  mission: null as unknown,
  router: null as string | null,
  status: { phase: 'ready', detail: null } as unknown,
  props: null as unknown,
  select: vi.fn(),
  read: vi.fn(),
  apply: vi.fn(),
}))

vi.mock('@peerfall/game/hooks', () => ({ useActiveMission: () => ({ mission: mocks.mission }) }))
vi.mock('@peerfall/machine/hooks', () => ({
  useRouterSelection: () => ({ router: mocks.router, select: mocks.select }),
  useRouterConfig: () => ({ read: mocks.read, apply: mocks.apply }),
  useMachineStatus: () => mocks.status,
}))
// The presentation mounts CodeMirror; the container's logic is all in the props it hands over.
vi.mock('@features/editor/components/editor', () => ({
  CodeEditorPresentation: (props: CodeEditorPresentationProps) => {
    mocks.props = props
    return null
  },
}))

const mission = MISSION_FIXTURE

const RUNNING_A = 'interface a-c\n ip ospf area 0\n'
const EDITED_A = `${RUNNING_A} ip ospf bfd\n`

const props = () => mocks.props as CodeEditorPresentationProps
const active = () => props().files.find((file) => file.path === props().activePath)
const at = (phase: VmStatus['phase']) => {
  mocks.status = { phase, detail: null }
}

async function mount(waiting: string | null = null) {
  const rendered = render(<EditorContainer waiting={waiting} />)
  await act(async () => {})
  return {
    ...rendered,
    again: async (next: string | null = waiting) => {
      rendered.rerender(<EditorContainer waiting={next} />)
      await act(async () => {})
    },
  }
}

beforeEach(() => {
  mocks.mission = mission
  mocks.router = null
  at('ready')
  mocks.read.mockImplementation(async (router: string) => (router === 'a' ? RUNNING_A : `router ${router}\n`))
  mocks.apply.mockResolvedValue({ ok: true, value: null })
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('EditorContainer', () => {
  it('says to pick a router on the map while none is selected, and reads nothing', async () => {
    await mount()
    expect(props().notice).toContain('Select a router on the map')
    expect(props().files.map((file) => file.path)).toEqual(['a/frr.conf', 'b/frr.conf', 'c/frr.conf'])
    expect(props().apply).toMatchObject({ kind: 'busy', reason: 'Select a router on the map first.' })
    expect(mocks.read).not.toHaveBeenCalled()
  })

  it('shows the selected router’s running configuration', async () => {
    mocks.router = 'a'
    await mount()
    expect(mocks.read).toHaveBeenCalledWith('a')
    expect(props().activePath).toBe('a/frr.conf')
    expect(active()?.content).toBe(RUNNING_A)
    expect(props().notice).toBeNull()
    expect(props().apply).toEqual({ kind: 'idle' })
  })

  it('moves the terminal with the tab that is chosen', async () => {
    mocks.router = 'a'
    await mount()
    props().onSelectFile('c/frr.conf')
    expect(mocks.select).toHaveBeenCalledWith('c')
  })

  it('applies the edited text to the selected router, then reads back what it runs', async () => {
    mocks.router = 'a'
    await mount()
    act(() => props().onChange('a/frr.conf', EDITED_A))
    expect(props().modified.has('a/frr.conf')).toBe(true)
    mocks.read.mockResolvedValue(`${EDITED_A}!\n`)
    await act(async () => props().onApply())
    expect(mocks.apply).toHaveBeenCalledWith('a', EDITED_A)
    expect(props().status).toBe('Applied to router a.')
    expect(props().errors).toEqual([])
    expect(active()?.content).toBe(`${EDITED_A}!\n`)
    expect(props().modified.size).toBe(0)
  })

  it('shows FRR’s own words for the lines it refused, and keeps the player’s text', async () => {
    mocks.router = 'a'
    mocks.apply.mockResolvedValue({ ok: false, errors: ['% Unknown command: ip ospf bdf'] })
    await mount()
    act(() => props().onChange('a/frr.conf', `${RUNNING_A} ip ospf bdf\n`))
    await act(async () => props().onApply())
    expect(props().errors).toEqual(['% Unknown command: ip ospf bdf'])
    expect(props().status).toBe('Router a refused part of it.')
    expect(active()?.content).toBe(`${RUNNING_A} ip ospf bdf\n`)
    expect(mocks.read).toHaveBeenCalledTimes(2)
  })

  it('drops every draft on Reset and reads the router again', async () => {
    mocks.router = 'a'
    await mount()
    act(() => props().onChange('a/frr.conf', EDITED_A))
    await act(async () => props().onReset())
    expect(active()?.content).toBe(RUNNING_A)
    expect(props().modified.size).toBe(0)
    expect(mocks.read).toHaveBeenCalledTimes(2)
  })

  it('reads the router again when the Machine comes back from a restore, as after Start over', async () => {
    mocks.router = 'a'
    mocks.read.mockResolvedValue(EDITED_A)
    const { again } = await mount()
    expect(active()?.content).toBe(EDITED_A)
    at('restoring')
    await again()
    expect(props().apply).toMatchObject({ kind: 'busy', label: 'Starting…' })
    mocks.read.mockResolvedValue(RUNNING_A)
    at('ready')
    await again()
    expect(active()?.content).toBe(RUNNING_A)
  })

  it('does not apply while a run is being measured, and says why', async () => {
    mocks.router = 'a'
    await mount('A run is being measured.')
    expect(props().apply).toMatchObject({
      kind: 'busy',
      reason: 'A run is being measured. Apply works again when it is done.',
    })
    await act(async () => props().onApply())
    expect(mocks.apply).not.toHaveBeenCalled()
  })

  it('says when a router does not answer', async () => {
    mocks.router = 'b'
    mocks.read.mockResolvedValue(null)
    await mount()
    expect(props().status).toBe('Router b did not answer. Select it again to retry.')
  })
})
