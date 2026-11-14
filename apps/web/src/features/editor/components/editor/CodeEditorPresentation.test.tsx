// @vitest-environment jsdom
import type { ApplyState } from '@features/editor/types'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CodeEditorPresentation, type CodeEditorPresentationProps } from './CodeEditorPresentation'

vi.mock('@features/editor/hooks/codemirror', () => ({
  useCodeEditor: () => ({ loaded: true, failed: false }),
}))

afterEach(cleanup)

function editor(apply: ApplyState, overrides: Partial<CodeEditorPresentationProps> = {}) {
  const props: CodeEditorPresentationProps = {
    files: [
      { path: 'a/frr.conf', content: '' },
      { path: 'b/frr.conf', content: '' },
      { path: 'c/frr.conf', content: '', readOnly: true },
    ],
    activePath: 'a/frr.conf',
    modified: new Set(['b/frr.conf']),
    apply,
    status: null,
    onSelectFile: vi.fn(),
    onChange: () => {},
    onApply: vi.fn(),
    onReset: vi.fn(),
    ...overrides,
  }
  render(<CodeEditorPresentation {...props} />)
  return props
}

describe('CodeEditorPresentation', () => {
  it('keeps Apply focusable but off while the Machine starts, and says why', () => {
    const reason = 'Building the network. Apply works once the network is up.'
    const { onApply } = editor({ kind: 'busy', label: 'Starting…', reason })
    const apply = screen.getByRole('button', { name: /Starting/ })
    expect(apply.getAttribute('aria-disabled')).toBe('true')
    expect(apply.getAttribute('title')).toBe(reason)
    expect(apply.hasAttribute('disabled')).toBe(false)
    expect(screen.getByText(reason).id).toBe(apply.getAttribute('aria-describedby'))
    fireEvent.click(apply)
    expect(onApply).not.toHaveBeenCalled()
  })

  it('shows Apply working, not switched off, while the routers load the configuration', () => {
    const { onApply } = editor({ kind: 'busy', label: 'Applying…', reason: 'FRR is loading it.', working: true })
    const apply = screen.getByRole('button', { name: /Applying/ })
    expect(apply.getAttribute('aria-busy')).toBe('true')
    fireEvent.click(apply)
    expect(onApply).not.toHaveBeenCalled()
  })

  it('applies once the Machine is ready', () => {
    const { onApply } = editor({ kind: 'idle' })
    const apply = screen.getByRole('button', { name: /^Apply/ })
    expect(apply.hasAttribute('aria-disabled')).toBe(false)
    fireEvent.click(apply)
    expect(onApply).toHaveBeenCalledTimes(1)
  })

  it('names a changed and a read-only configuration in words, not by a mark alone', () => {
    editor({ kind: 'idle' })
    expect(screen.getByRole('tab', { name: /b\/frr\.conf.*modified/ })).toBeTruthy()
    expect(screen.getByRole('tab', { name: /c\/frr\.conf.*read-only/ })).toBeTruthy()
  })

  it('moves between routers with the arrow keys', () => {
    const { onSelectFile } = editor({ kind: 'idle' })
    fireEvent.keyDown(screen.getByRole('tablist', { name: 'Router configurations' }), { key: 'ArrowRight' })
    expect(onSelectFile).toHaveBeenCalledWith('b/frr.conf')
  })

  it('asks before it resets every configuration', () => {
    const { onReset } = editor({ kind: 'idle' })
    fireEvent.click(screen.getByRole('button', { name: 'Reset' }))
    expect(onReset).not.toHaveBeenCalled()
    expect(screen.getByText('Reset every router?')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Reset' }))
    expect(onReset).toHaveBeenCalledTimes(1)
  })

  it('keeps the whole note on what Apply did in a tooltip, for when the bar cuts it short', () => {
    editor({ kind: 'idle' }, { status: 'Applied to router c.' })
    const note = screen.getByRole('status')
    expect(note.textContent).toBe('Applied to router c.')
    expect(note.getAttribute('title')).toBe('Applied to router c.')
    expect(screen.getByRole('tab', { name: /c\/frr\.conf/ }).textContent).toContain('c/frr.conf')
  })

  it('says what to do while there is nothing to edit', () => {
    editor({ kind: 'idle' }, { notice: 'Select a router on the map.' })
    expect(screen.getByText('Select a router on the map.')).toBeTruthy()
  })

  it('prints what the router answered to the lines it refused, as an alert', () => {
    editor({ kind: 'idle' }, { errors: ['% Unknown command: ip ospf bdf'] })
    const alert = screen.getByRole('alert')
    expect(alert.textContent).toContain('What it accepted stays applied.')
    expect(alert.textContent).toContain('% Unknown command: ip ospf bdf')
  })
})
