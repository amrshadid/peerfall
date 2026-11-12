// @vitest-environment jsdom
import { machineLockOf } from '@shared/utils/machine'
import { cleanup, render, screen } from '@testing-library/react'
import { createRef } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { TerminalPresentation } from './TerminalPresentation'

afterEach(cleanup)

describe('TerminalPresentation', () => {
  it('hands its element to the ref and shows no plate while the shell is up', () => {
    const ref = createRef<HTMLDivElement>()
    render(<TerminalPresentation ref={ref} lock={null} />)
    expect(ref.current).toBeInstanceOf(HTMLDivElement)
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('says in words what the Machine is doing, and which step of the start-up it is on', () => {
    const lock = machineLockOf({ phase: 'setting-up', detail: null }, false)
    render(<TerminalPresentation ref={createRef()} lock={lock} />)
    expect(screen.getByRole('status').textContent).toContain('Building the network')
    expect(screen.getByRole('list', { name: 'Step 3 of 3' })).toBeTruthy()
  })

  it('raises a failure as an alert, with the reason', () => {
    const lock = machineLockOf({ phase: 'failed', detail: 'No Linux image at /vm/' }, false)
    render(<TerminalPresentation ref={createRef()} lock={lock} />)
    expect(screen.getByRole('alert').textContent).toContain('No Linux image at /vm/')
  })
})
