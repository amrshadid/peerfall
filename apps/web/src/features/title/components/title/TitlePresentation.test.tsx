// @vitest-environment jsdom
import { FIGURE_KEY, JOURNEY, TITLE_FIGURE, titleContentsOf, titleStartOf } from '@features/title/utils/contents'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { TitlePresentation, type TitlePresentationProps } from './TitlePresentation'

afterEach(cleanup)

function title(overrides: Partial<TitlePresentationProps> = {}) {
  const props: TitlePresentationProps = {
    chrome: { themeLabel: 'Night print', onToggleTheme: vi.fn(), storageIssue: null, onExport: null, onTour: null },
    start: titleStartOf(),
    contents: titleContentsOf({ journey: JOURNEY, devRoutes: false }),
    figure: TITLE_FIGURE,
    figureKey: FIGURE_KEY,
    storageText: 'Saved in this browser',
    onShortcuts: vi.fn(),
    ...overrides,
  }
  render(<TitlePresentation {...props} />)
  return props
}

describe('TitlePresentation', () => {
  it("names the game in the page's one h1", () => {
    title()
    expect(screen.getByRole('heading', { level: 1, name: 'Peerfall' })).toBeTruthy()
  })

  it('makes Start the primary action, with where it leads', () => {
    const { start } = title()
    const button = screen.getByRole('link', { name: 'Start' })
    expect(button.getAttribute('href')).toBe(start.href)
    expect(button.hasAttribute('data-primary')).toBe(true)
    expect(screen.getByText('Stage 4 · Recover from failure · The Link That Never Went Down')).toBeTruthy()
  })

  it('lists the journey, linking only what can be opened', () => {
    title()
    const contents = within(screen.getByRole('navigation', { name: 'Main menu' })).getByRole('list', {
      name: 'Contents',
    })
    expect(within(contents).getAllByRole('listitem')).toHaveLength(12)
    expect(
      within(contents)
        .getAllByRole('link')
        .map((link) => link.textContent)
    ).toEqual(['4 · Recover from failurebfdd, vrrpd', 'Settingstheme, text size, keys'])
  })

  it("draws Fig. 1 with each link's state in words, and no router to press", () => {
    title()
    const figure = screen.getByRole('figure')
    expect(within(figure).getByText(/dropping packets, so traffic goes round through b/)).toBeTruthy()
    const links = within(within(figure).getByRole('list', { name: 'Links' })).getAllByRole('listitem')
    expect(links.map((item) => item.textContent)).toEqual([
      'Link a to b: up, on the path',
      'Link a to c: dropping packets',
      'Link b to c: up, on the path',
    ])
    expect(within(figure).queryAllByRole('button')).toEqual([])
  })

  it('switches the theme and opens the shortcuts', () => {
    const { chrome, onShortcuts } = title()
    fireEvent.click(screen.getByRole('button', { name: 'Switch to Night print' }))
    expect(chrome.onToggleTheme).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole('button', { name: /^Shortcuts/ }))
    expect(onShortcuts).toHaveBeenCalledTimes(1)
  })

  it('says so, in a banner, when the window cannot store progress', () => {
    title({
      chrome: {
        themeLabel: 'Night print',
        onToggleTheme: () => {},
        storageIssue: 'private',
        onExport: null,
        onTour: null,
      },
    })
    expect(screen.getByText(/Progress can't be saved in this window/)).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Export save' })).toBeNull()
  })
})
