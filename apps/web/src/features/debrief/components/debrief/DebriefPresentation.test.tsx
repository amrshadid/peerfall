// @vitest-environment jsdom
import type { DebriefPresentationProps } from '@features/debrief/types'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  DEBRIEF_COMMANDS,
  DEBRIEF_EXPLANATION,
  DEBRIEF_LAB_NOTE,
  DEBRIEF_LEARNED,
  DEBRIEF_MEASURES,
} from '@/test/fixtures/debrief.fixture'
import { DebriefPresentation } from './DebriefPresentation'

afterEach(cleanup)

function debrief(overrides: Partial<DebriefPresentationProps> = {}) {
  const props: DebriefPresentationProps = {
    title: 'The Link That Never Went Down',
    verdict: { passed: true, text: 'Passed: traffic was back in 0.90 s, inside the 2.00 s target.' },
    measures: DEBRIEF_MEASURES,
    explanation: DEBRIEF_EXPLANATION,
    learned: DEBRIEF_LEARNED,
    commands: DEBRIEF_COMMANDS,
    labNote: DEBRIEF_LAB_NOTE,
    next: null,
    onReplay: vi.fn(),
    titleHref: '#/',
    ...overrides,
  }
  render(<DebriefPresentation {...props} />)
  return props
}

describe('DebriefPresentation', () => {
  it('gives the verdict in words, with a mark that says the same', () => {
    debrief()
    const region = screen.getByRole('region', { name: 'The Link That Never Went Down' })
    expect(within(region).getByText(/^Passed: traffic was back in 0\.90 s/)).toBeTruthy()
    expect(within(region).getByRole('img', { name: 'Passes' })).toBeTruthy()
  })

  it('says so in words when the run did not pass', () => {
    debrief({ verdict: { passed: false, text: 'Not passed: traffic was lost for 37.8 s.' } })
    expect(screen.getByText('Not passed: traffic was lost for 37.8 s.')).toBeTruthy()
    expect(screen.getByRole('img', { name: 'Not passing yet' })).toBeTruthy()
  })

  it('lists what was measured, each number with its name', () => {
    debrief()
    const measures = screen.getByLabelText('Measurements')
    expect(within(measures).getByText('Baseline outage').nextElementSibling?.textContent).toBe('37.8 s')
    expect(within(measures).getByText('Outage with BFD').nextElementSibling?.textContent).toBe('0.90 s')
  })

  it('explains why, and gives the commands to repeat it on real FRR', () => {
    debrief()
    expect(screen.getByRole('region', { name: 'Why it worked' }).textContent).toContain('dead interval')
    const commands = screen.getByRole('region', { name: /^Try it on real FRR/ })
    expect([...commands.querySelectorAll('dt')].map((term) => term.textContent)).toEqual([
      'show bfd peers',
      'show ip ospf neighbor',
    ])
    expect(commands.textContent).toContain('lab/')
  })

  it('makes the next mission the primary way on when there is one', () => {
    const onSelect = vi.fn()
    const { onReplay } = debrief({ next: { label: 'Next mission', onSelect } })
    fireEvent.click(screen.getByRole('button', { name: 'Next mission' }))
    expect(onSelect).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole('button', { name: 'Play it again' }))
    expect(onReplay).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('link', { name: 'Back to the title' }).getAttribute('href')).toBe('#/')
  })

  it('leaves out the sections it has nothing for', () => {
    debrief({ measures: [], explanation: [], commands: [], learned: [] })
    expect(screen.getAllByRole('region')).toHaveLength(1)
    expect(screen.queryByText('New in this mission')).toBeNull()
  })
})
