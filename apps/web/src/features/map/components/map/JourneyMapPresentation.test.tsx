// @vitest-environment jsdom
import { EMPTY_DETAIL, mapDetailOf } from '@features/map/utils/detail'
import { FIRST_MISSION, journeyFixture, longerJourneyFixture, SECOND_MISSION } from '@features/map/utils/fixtures'
import { journeyChapters, journeyStops, journeySummary } from '@features/map/utils/journey'
import { mapNotesOf } from '@features/map/utils/note'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { JourneyMapPresentation } from './JourneyMapPresentation'

const WIDTH = 774
const HEIGHT = 600

beforeEach(() => {
  // jsdom lays nothing out: give every element the scroller's size.
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(WIDTH)
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(HEIGHT)
  HTMLElement.prototype.scrollTo = vi.fn()
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    }
  )
  // Paint at once instead of on the next frame.
  vi.stubGlobal('requestAnimationFrame', (paint: FrameRequestCallback) => {
    paint(0)
    return 0
  })
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

interface Setup {
  source?: ReturnType<typeof journeyFixture>
  next?: { readonly id: string; readonly title: string } | null
}

interface HarnessProps {
  chapters: ReturnType<typeof journeyChapters>
  next: Setup['next']
  onPlay: (key: string) => void
  onShortcuts: () => void
}

const CHROME = {
  themeLabel: 'Night print',
  onToggleTheme: () => undefined,
  storageIssue: null,
  onExport: null,
  onTour: null,
}

/** The presentation with the selection held as the container holds it. */
function Harness({ chapters, next, onPlay, onShortcuts }: HarnessProps) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const stops = journeyStops(chapters)
  const selected = stops.find((stop) => stop.key === selectedKey) ?? stops.find((stop) => stop.here) ?? stops[0]
  return (
    <JourneyMapPresentation
      chrome={CHROME}
      titleHref="#/"
      recommended={next ? { label: next.title, href: `#/mission/${next.id}` } : null}
      section={{
        chapters,
        notes: mapNotesOf(chapters),
        selectedKey: selected?.key ?? null,
        reducedMotion: true,
        onSelect: setSelectedKey,
        onPlay,
      }}
      detail={selected ? mapDetailOf(selected, chapters) : EMPTY_DETAIL}
      summary={journeySummary(chapters)}
      version="Peerfall test"
      onShortcuts={onShortcuts}
    />
  )
}

function setup({ source = journeyFixture(), next = FIRST_MISSION }: Setup = {}) {
  const chapters = journeyChapters(source, next)
  const onPlay = vi.fn()
  const onShortcuts = vi.fn()
  const view = render(<Harness chapters={chapters} next={next} onPlay={onPlay} onShortcuts={onShortcuts} />)
  const stop = (name: RegExp) => screen.getByRole('button', { name })
  const detail = () => within(screen.getByRole('complementary'))
  /** The selected mission's status, as the panel's head prints it beside its mark. */
  const status = () => view.container.querySelector('.map-detail__state')?.textContent
  const note = () => view.container.querySelector('.map-note')?.textContent ?? ''
  return { view, chapters, onPlay, onShortcuts, stop, detail, status, note }
}

describe('JourneyMapPresentation', () => {
  it('names the screen in one h1 that can take the focus, with the way back to the title', () => {
    setup()
    const heading = screen.getByRole('heading', { level: 1, name: 'Map' })
    expect(heading.getAttribute('tabindex')).toBe('-1')
    expect(screen.getByRole('link', { name: 'Title' }).getAttribute('href')).toBe('#/')
  })

  it('recommends the next mission and continues to it', () => {
    setup()
    const bar = within(screen.getByRole('navigation', { name: 'Map' }))
    expect(bar.getByText('The Link That Never Went Down')).toBeTruthy()
    expect(bar.getByRole('link', { name: 'Continue' }).getAttribute('href')).toBe(
      '#/mission/the-link-that-never-went-down'
    )
  })

  it('recommends nothing once every open mission is completed', () => {
    setup({ source: journeyFixture('completed'), next: null })
    expect(screen.queryByText(/Recommended next/)).toBeNull()
  })

  it('lists all eleven stages, in the drawing and on the gauge', () => {
    const { chapters } = setup()
    const drawing = within(screen.getByRole('group', { name: /^Map of the journey/ }))
    for (const chapter of chapters) {
      expect(drawing.getByRole('group', { name: `Stage ${chapter.stage}: ${chapter.name}` })).toBeTruthy()
    }
    const gauge = within(screen.getByRole('navigation', { name: 'Stage gauge' }))
    expect(gauge.getAllByRole('listitem')).toHaveLength(11)
    expect(gauge.getByRole('button', { name: 'Stage 4, Recover from failure, 0 of 1 passed' })).toBeTruthy()
  })

  it('says in words that a stage with no missions is planned', () => {
    setup()
    const stage = within(screen.getByRole('group', { name: 'Stage 6: Exchange routes' }))
    expect(stage.getByText('Planned: no missions yet')).toBeTruthy()
    expect(stage.queryByRole('button')).toBeNull()
    expect(
      screen.getByRole('button', { name: 'Stage 6, Exchange routes, Planned: no missions yet' }).textContent
    ).toContain('planned')
  })

  it('shows the selected mission: its status in words, its objective, and a Play link to it', () => {
    const { detail, status } = setup()
    expect(detail().getByRole('heading', { level: 2, name: 'The Link That Never Went Down' })).toBeTruthy()
    expect(status()).toBe('Available, you are here')
    expect(detail().getByText(FIRST_MISSION.objective)).toBeTruthy()
    expect(detail().getByText('Nothing: start here')).toBeTruthy()
    expect(detail().getByText('None yet')).toBeTruthy()
    expect(detail().getByText('Traffic back within 2 s')).toBeTruthy()
    expect(detail().getByRole('link', { name: 'Play' }).getAttribute('href')).toBe(
      '#/mission/the-link-that-never-went-down'
    )
  })

  it('gives a locked mission no link: plain words say what to complete first', () => {
    const { stop, detail, status } = setup({ source: longerJourneyFixture(false) })
    fireEvent.click(stop(/^4\.2 /))
    expect(detail().getByRole('heading', { level: 2, name: 'A Restart Nobody Noticed' })).toBeTruthy()
    expect(status()).toBe('Locked')
    expect(detail().queryByRole('link')).toBeNull()
    expect(detail().getByText('Locked: complete The Link That Never Went Down first.')).toBeTruthy()
    expect(detail().getByText('not completed yet')).toBeTruthy()
  })

  it('offers Continue for a mission under way and Replay for a completed one', () => {
    const { stop, detail, status } = setup({ source: longerJourneyFixture(true), next: SECOND_MISSION })
    expect(detail().getByRole('link', { name: 'Play' })).toBeTruthy()
    fireEvent.click(stop(/^4\.1 /))
    expect(status()).toBe('Completed')
    expect(detail().getByRole('link', { name: 'Replay' })).toBeTruthy()
    expect(detail().getByText('3 judged runs')).toBeTruthy()
    expect(detail().getByText('2 hints')).toBeTruthy()
  })

  it('walks the road with the arrow keys, Home and End, and plays with Enter', () => {
    const { stop, detail, onPlay } = setup({ source: longerJourneyFixture(false) })
    const first = stop(/^4\.1 /)
    const second = stop(/^4\.2 /)
    expect(first.getAttribute('tabindex')).toBe('0')
    expect(second.getAttribute('tabindex')).toBe('-1')

    first.focus()
    fireEvent.keyDown(first, { key: 'ArrowRight' })
    expect(document.activeElement).toBe(second)
    expect(second.getAttribute('aria-pressed')).toBe('true')
    expect(detail().getByRole('heading', { level: 2, name: 'A Restart Nobody Noticed' })).toBeTruthy()

    fireEvent.keyDown(second, { key: 'ArrowDown' })
    expect(document.activeElement).toBe(second)
    fireEvent.keyDown(second, { key: 'Home' })
    expect(document.activeElement).toBe(first)
    fireEvent.keyDown(first, { key: 'End' })
    expect(document.activeElement).toBe(second)
    fireEvent.keyDown(second, { key: 'ArrowUp' })
    expect(document.activeElement).toBe(first)
    // The only stage with missions: there is no other stage to change to.
    fireEvent.keyDown(first, { key: 'PageDown' })
    expect(document.activeElement).toBe(first)

    fireEvent.keyDown(first, { key: 'Enter' })
    expect(onPlay).toHaveBeenCalledWith(FIRST_MISSION.id)
  })

  it('explains the focused mission under the drawing, else the stage in view', () => {
    const { stop, note } = setup()
    expect(note()).toContain('What this stage covers · ')
    const mission = stop(/^4\.1 /)
    fireEvent.focus(mission)
    expect(note()).toContain('4.1 · The Link That Never Went Down')
    expect(note()).toContain('Next up')
    fireEvent.blur(mission)
    fireEvent.mouseEnter(screen.getByRole('button', { name: /^Stage 9, / }))
    expect(note()).toContain('What this stage covers · Label and steer')
  })

  it('scrolls to a stage from the gauge and back to "you" with Find me', () => {
    setup()
    const scrollTo = vi.mocked(HTMLElement.prototype.scrollTo)
    scrollTo.mockClear()
    fireEvent.click(screen.getByRole('button', { name: /^Stage 11, / }))
    expect(scrollTo).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole('button', { name: 'Find me' }))
    expect(scrollTo).toHaveBeenCalledTimes(2)
  })

  it('has nowhere to find when the player stands nowhere', () => {
    setup({ source: journeyFixture('completed'), next: null })
    expect(screen.getByRole('button', { name: 'Find me' }).hasAttribute('disabled')).toBe(true)
  })

  it('explains every shape in the legend, in words', () => {
    setup()
    const legend = within(screen.getByRole('region', { name: 'Legend' }))
    expect(legend.getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      'Planned',
      'Locked',
      'Available',
      'In progress',
      'Completed',
      'Road travelled',
      'Road ahead',
    ])
  })

  it('keeps the status foot: where the player is, the version, and the shortcuts', () => {
    const { onShortcuts } = setup()
    expect(screen.getByText('Stage 4, Recover from failure: 0 of 1 mission passed · 10 stages planned')).toBeTruthy()
    expect(screen.getByText('Peerfall test')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /^Shortcuts/ }))
    expect(onShortcuts).toHaveBeenCalledOnce()
  })

  it('stays a whole screen before the content is loaded', () => {
    setup({ source: [], next: null })
    expect(screen.getByRole('heading', { level: 2, name: 'Map' })).toBeTruthy()
    expect(screen.getByText(EMPTY_DETAIL.note ?? '')).toBeTruthy()
  })

  it('never calls the network anything but real', () => {
    const { view } = setup()
    expect(view.container.textContent?.toLowerCase()).not.toMatch(/simulat|emulat/)
  })
})
