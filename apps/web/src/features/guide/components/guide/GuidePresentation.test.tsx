// @vitest-environment jsdom
import type { GuidePresentationProps } from '@features/guide/types'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { COMMANDS, HINTS, INCIDENT, OBJECTIVES, TASK } from '@/test/fixtures/guide.fixture'
import { GuidePresentation } from './GuidePresentation'

afterEach(cleanup)

function guide(overrides: Partial<GuidePresentationProps> = {}) {
  const props: GuidePresentationProps = {
    stepLabel: 'Inspect',
    incident: INCIDENT,
    task: TASK,
    objectives: OBJECTIVES,
    commands: COMMANDS.map((entry) => ({ ...entry, onRun: null })),
    hints: { revealed: [], left: 3, onReveal: vi.fn() },
    note: null,
    actions: [],
    ...overrides,
  }
  render(<GuidePresentation {...props} />)
  return props
}

describe('GuidePresentation', () => {
  it('opens with the incident report, real terms set in the code face', () => {
    guide()
    const incident = screen.getByRole('article', { name: 'The Link That Never Went Down' })
    expect(within(incident).getByText('Incident report')).toBeTruthy()
    expect(within(incident).getByText('Filed by the network operations desk')).toBeTruthy()
    expect([...incident.querySelectorAll('code')].map((code) => code.textContent)).toEqual(['a', 'c'])
  })

  it('names the step and says what to do in it', () => {
    guide()
    const task = screen.getByRole('region', { name: /^Inspect/ })
    expect(task.textContent).toContain('how it learns that a neighbor is gone')
  })

  it('counts the objectives met, and marks each one in words as well as by its box', () => {
    guide()
    const objectives = screen.getByRole('region', { name: /^Objectives/ })
    expect(within(objectives).getByText('1 of 3 met')).toBeTruthy()
    expect(within(objectives).getAllByRole('img', { name: 'Passes' })).toHaveLength(1)
    expect(within(objectives).getAllByRole('img', { name: 'Not passing yet' })).toHaveLength(2)
  })

  it('says what the last run showed under an open objective', () => {
    guide()
    expect(screen.getByText(/Last run: traffic was lost for 37\.8 s/)).toBeTruthy()
  })

  it('offers hints one stage at a time, and says how many are left', () => {
    const { hints } = guide()
    const section = screen.getByRole('region', { name: /^Hints/ })
    expect(within(section).getByText('3 left')).toBeTruthy()
    expect(within(section).queryAllByRole('listitem')).toEqual([])
    fireEvent.click(within(section).getByRole('button', { name: 'Show a hint' }))
    expect(hints.onReveal).toHaveBeenCalledTimes(1)
  })

  it('lists the hints revealed so far with their stage, and stops offering when none are left', () => {
    guide({ hints: { revealed: HINTS, left: 0, onReveal: null } })
    const section = screen.getByRole('region', { name: /^Hints/ })
    expect(within(section).getByText('none left')).toBeTruthy()
    expect(
      within(section)
        .getAllByRole('listitem')
        .map((item) => item.textContent?.split(',')[0])
    ).toEqual(['Hint 1', 'Hint 2', 'Hint 3'])
    expect(within(section).getByText('Hint 3, the command')).toBeTruthy()
    expect(within(section).queryByRole('button')).toBeNull()
  })

  it('types a suggested command into the terminal on a click, or only names it', () => {
    const onRun = vi.fn()
    guide({
      commands: [
        { command: 'show ip ospf neighbor', explain: 'Who a is adjacent to.', onRun },
        { command: 'vtysh', explain: "FRR's console.", onRun: null },
      ],
    })
    fireEvent.click(screen.getByRole('button', { name: 'Type show ip ospf neighbor into the terminal' }))
    expect(onRun).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('button', { name: /vtysh/ })).toBeNull()
    expect(screen.getByText('vtysh').tagName).toBe('CODE')
  })

  it('keeps the way on as buttons, with their shortcut printed', () => {
    const onSelect = vi.fn()
    guide({ actions: [{ id: 'next', label: 'Next: Predict', kind: 'primary', keys: 'Alt+N', onSelect }] })
    const next = screen.getByRole('button', { name: /Next: Predict/ })
    expect(within(next).getByText('Alt+N')).toBeTruthy()
    fireEvent.click(next)
    expect(onSelect).toHaveBeenCalledTimes(1)
  })

  it('leaves out the sections it has nothing for', () => {
    guide({
      task: [],
      objectives: [],
      commands: [],
      hints: { revealed: [], left: 0, onReveal: null },
      note: 'Nothing is timed.',
    })
    expect(screen.queryByRole('region')).toBeNull()
    expect(screen.getByText('Nothing is timed.')).toBeTruthy()
  })

  it('folds the report under its title once it has been read, one key away', () => {
    guide({
      incident: { ...INCIDENT, content: [{ kind: 'paragraph', text: 'Traffic **stopped**.' }], folded: true },
    })
    const incident = screen.getByRole('article', { name: 'The Link That Never Went Down' })
    const report = incident.querySelector('details')
    expect(report?.open).toBe(false)
    expect(within(incident).getByText('Read the report again').tagName).toBe('SUMMARY')
    expect(within(incident).getByText('stopped').tagName).toBe('B')
  })

  it('says what a met objective was met by, in quiet words under it', () => {
    guide({
      objectives: [{ id: 'direct', text: 'a reaches c directly.', passed: true, evidence: '60 replies came back.' }],
    })
    expect(screen.getByText(/Last run: 60 replies came back\./).closest('.guide__evidence')).not.toBeNull()
  })

  it('keeps what the network is doing in view, marked busy while it works and as an alert when it failed', () => {
    guide({ status: { text: 'Starting the routers…', busy: true, failed: false, details: [] } })
    // The hints keep a live region of their own, for a copied command.
    const status = screen.getAllByRole('status').find((each) => each.getAttribute('aria-busy') === 'true')
    expect(status?.textContent).toContain('Working')
    expect(status?.textContent).toContain('Starting the routers…')
    cleanup()

    guide({ status: { text: 'The network could not be started.', busy: false, failed: true, details: ['exit 2'] } })
    expect(screen.getByRole('alert').textContent).toContain('exit 2')
  })

  it('keeps an action that has to wait focusable, and says why it waits', () => {
    const onSelect = vi.fn()
    guide({
      actions: [
        { id: 'fault', label: 'Break the link', kind: 'default', unavailable: 'A probe is being sent.', onSelect },
      ],
    })
    const action = screen.getByRole('button', { name: /Break the link/ })
    expect(action.hasAttribute('disabled')).toBe(false)
    expect(action.getAttribute('aria-disabled')).toBe('true')
    expect(action.textContent).toContain('not available: A probe is being sent.')
    fireEvent.click(action)
    expect(onSelect).not.toHaveBeenCalled()
  })
})
