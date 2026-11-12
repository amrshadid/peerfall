// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { StepRail } from './StepRail'

afterEach(cleanup)

const STEPS = [
  { id: 'inspect', label: 'Inspect' },
  { id: 'predict', label: 'Predict' },
  { id: 'apply', label: 'Apply' },
  { id: 'verify', label: 'Verify' },
]

describe('StepRail', () => {
  it('exposes one list of steps: the measuring copies stay hidden from assistive tech', () => {
    render(<StepRail label="Mission steps" steps={STEPS} currentIndex={2} />)
    expect(screen.getAllByRole('list')).toHaveLength(1)
    expect(screen.getByRole('list', { name: 'Mission steps' })).toBeTruthy()
  })

  it('marks the current step for assistive tech, not by colour alone', () => {
    render(<StepRail label="Mission steps" steps={STEPS} currentIndex={2} />)
    const current = screen.getAllByRole('listitem').filter((item) => item.getAttribute('aria-current') === 'step')
    expect(current.map((item) => item.textContent)).toEqual(['Apply'])
  })

  it('keeps done steps clickable by name', () => {
    const onSelect = vi.fn()
    render(<StepRail label="Mission steps" steps={STEPS} currentIndex={2} onSelect={onSelect} />)
    screen.getByRole('button', { name: 'Inspect (done), look again' }).click()
    expect(onSelect).toHaveBeenCalledWith('inspect')
  })
})
