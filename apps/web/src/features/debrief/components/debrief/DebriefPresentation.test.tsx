// @vitest-environment jsdom
import type { DebriefPresentationProps } from '@features/debrief/types'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DEBRIEF_CARDS, DEBRIEF_LEARNED, DEBRIEF_MEASURES } from '@/test/fixtures/debrief.fixture'
import { DebriefPresentation } from './DebriefPresentation'

afterEach(cleanup)

function debrief(overrides: Partial<DebriefPresentationProps> = {}) {
  const props: DebriefPresentationProps = {
    headline: 'An interface that is up says nothing about packets getting through.',
    result: 'Mission complete · 3 of 3 objectives met · traffic back in 0.90 s, inside 2.00 s',
    measures: DEBRIEF_MEASURES,
    learned: DEBRIEF_LEARNED,
    cards: DEBRIEF_CARDS,
    seenIn: '4.1 The Link That Never Went Down',
    stage: null,
    next: null,
    onReplay: vi.fn(),
    mapHref: '#/map',
    ...overrides,
  }
  render(<DebriefPresentation {...props} />)
  return props
}

describe('DebriefPresentation', () => {
  it("opens as Kernelfall's card: the debrief's headline, then the result in words", () => {
    debrief()
    const region = screen.getByRole('region', { name: /^An interface that is up/ })
    expect(within(region).getByRole('heading', { level: 2 }).textContent).toBe(
      'An interface that is up says nothing about packets getting through.'
    )
    expect(within(region).getByText(/^Mission complete · 3 of 3 objectives met/)).toBeTruthy()
  })

  it('lists what was measured, each number with its name', () => {
    debrief()
    const measures = screen.getByLabelText('Measurements')
    expect(within(measures).getByText('Baseline outage').nextElementSibling?.textContent).toBe('37.8 s')
    expect(within(measures).getByText('Outage with BFD').nextElementSibling?.textContent).toBe('0.90 s')
  })

  it('prints every card the mission filed, stamped Filed with where it was filed', () => {
    debrief()
    const cards = screen.getAllByRole('article')
    expect(cards).toHaveLength(DEBRIEF_CARDS.length)
    for (const card of cards) {
      expect(card.querySelector('.pf-man-page__stamp')?.textContent).toBe(
        'FiledCodex · 4.1 The Link That Never Went Down'
      )
    }
    expect(cards.map((card) => card.getAttribute('aria-labelledby'))).toEqual(
      DEBRIEF_CARDS.map((card) => `codex-${card.id}`)
    )
  })

  it("offers Kernelfall's three ways on: the next mission first, Replay, and back to the map", () => {
    const onSelect = vi.fn()
    const { onReplay } = debrief({ next: { label: 'Next mission: Stage 3', onSelect } })
    const actions = [...document.querySelectorAll('.debrief__actions > *')].map((action) => action.textContent)
    expect(actions).toEqual(['Next mission: Stage 3', 'Replay mission', 'Back to the map'])
    fireEvent.click(screen.getByRole('button', { name: 'Next mission: Stage 3' }))
    expect(onSelect).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole('button', { name: 'Replay mission' }))
    expect(onReplay).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('link', { name: 'Back to the map' }).getAttribute('href')).toBe('#/map')
  })

  it('makes the map the primary way on when there is no next mission', () => {
    debrief()
    expect(screen.getByRole('link', { name: 'Back to the map' }).className).toContain('primary')
  })

  it('shows what the player can now do once the mission finishes its stage', () => {
    debrief({ stage: { name: 'Stage 1 · First router', outcomes: ['Start FRR on a router.'] } })
    const stage = screen.getByRole('region', { name: 'Stage 1 · First router, done' })
    expect(within(stage).getByText('You can now…')).toBeTruthy()
    expect(within(stage).getByRole('listitem').textContent).toBe('Start FRR on a router.')
  })

  it('leaves out the parts it has nothing for', () => {
    debrief({ measures: [], learned: [], cards: [] })
    expect(screen.getAllByRole('region')).toHaveLength(1)
    expect(screen.queryByText('New in this mission')).toBeNull()
    expect(screen.queryByRole('article')).toBeNull()
  })
})
