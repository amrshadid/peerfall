// @vitest-environment jsdom
import { useAppStore } from '@app/store'
import type { TerminalViewOptions } from '@features/terminal/hooks/view'
import type { VmStatus } from '@peerfall/machine/types'
import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TerminalContainer } from './TerminalContainer'

const mocks = vi.hoisted(() => ({
  status: { phase: 'loading', detail: null } as unknown,
  onOutput: null as ((bytes: Uint8Array) => void) | null,
  options: null as unknown,
  send: vi.fn(),
  resize: vi.fn(),
  write: vi.fn(),
  focus: vi.fn(),
}))

vi.mock('@peerfall/machine/hooks', () => ({
  useLinuxTerminal: (onOutput: (bytes: Uint8Array) => void) => {
    mocks.onOutput = onOutput
    return { ...(mocks.status as VmStatus), send: mocks.send }
  },
  useTerminalSize: () => ({ resize: mocks.resize }),
  useMachineStatus: () => mocks.status,
}))

// Stable across renders, as the real view is.
const view = { write: mocks.write, focus: mocks.focus }
vi.mock('@features/terminal/hooks/view', () => ({
  useTerminalView: (_container: unknown, options: TerminalViewOptions) => {
    mocks.options = options
    return view
  },
}))

const options = () => mocks.options as TerminalViewOptions

const at = (phase: VmStatus['phase'], detail: string | null = null) => {
  mocks.status = { phase, detail }
}

beforeEach(() => at('loading'))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('TerminalContainer', () => {
  it('joins the terminal to the Machine: keys go in, bytes come out, the size follows', () => {
    at('ready')
    render(<TerminalContainer />)
    options().onInput('show ip route\r')
    options().onResize(30, 100)
    expect(mocks.send).toHaveBeenCalledWith('show ip route\r')
    expect(mocks.resize).toHaveBeenCalledWith(30, 100)
    const bytes = new Uint8Array([97])
    mocks.onOutput?.(bytes)
    expect(mocks.write).toHaveBeenCalledWith(bytes)
  })

  it.each([
    ['loading', 'Loading the Machine'],
    ['booting', 'Booting Linux'],
    ['setting-up', 'Building the network'],
  ] as const)('is locked, with a plate that says why, while the Machine is %s', (phase, title) => {
    at(phase)
    render(<TerminalContainer />)
    expect(options().locked).toBe(true)
    expect(screen.getByRole('status').textContent).toContain(title)
    expect(mocks.write).toHaveBeenCalledWith(expect.stringContaining('…'))
  })

  it('opens once the shell is at its prompt', () => {
    at('ready')
    render(<TerminalContainer />)
    expect(options().locked).toBe(false)
    expect(screen.queryByRole('status')).toBeNull()
    expect(mocks.write).not.toHaveBeenCalled()
  })

  it('keeps the plate but lets keys through while a network that was up is restored: the Machine holds them', () => {
    at('ready')
    const { rerender } = render(<TerminalContainer />)
    at('restoring')
    rerender(<TerminalContainer />)
    expect(screen.getByRole('status').textContent).toContain('Restoring the Machine')
    expect(options().locked).toBe(false)
  })

  it('says why the Machine failed, on the plate and in the terminal', () => {
    at('failed', 'No Linux image at /vm/')
    render(<TerminalContainer />)
    expect(screen.getByRole('alert').textContent).toContain('No Linux image at /vm/')
    expect(mocks.write).toHaveBeenCalledWith(expect.stringContaining('could not start: No Linux image at /vm/'))
    expect(options().locked).toBe(true)
  })

  it('takes focus on the terminal shortcut', () => {
    at('ready')
    render(<TerminalContainer />)
    act(() => useAppStore.getState().shortcutHandlers['focus-terminal']?.())
    expect(mocks.focus).toHaveBeenCalledTimes(1)
  })
})
