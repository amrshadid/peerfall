// @vitest-environment jsdom
import type { MissionLayoutModel } from '@features/mission/types'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { MISSION_LAYOUT } from '@/test/fixtures/mission-layout.fixture'
import { MissionScreenPresentation } from './MissionScreenPresentation'

beforeAll(() => {
  // jsdom has no modal dialogs; the layout only needs them to open and close.
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.open = true
  }
  HTMLDialogElement.prototype.close = function close() {
    this.open = false
  }
})

afterEach(cleanup)

const layout = (overrides: Partial<MissionLayoutModel> = {}) =>
  render(<MissionScreenPresentation unavailable={null} layout={{ ...MISSION_LAYOUT, ...overrides }} />)

describe('MissionScreenPresentation', () => {
  it('puts every slot in its panel: guide, editor, terminal, topology, timeline', () => {
    layout()
    expect(within(screen.getByRole('complementary', { name: 'Guide' })).getByText('guide slot')).toBeTruthy()
    const workspace = screen.getByRole('region', { name: 'Workspace' })
    expect(within(workspace).getByText('editor slot')).toBeTruthy()
    expect(within(screen.getByRole('region', { name: 'Terminal' })).getByText('terminal slot')).toBeTruthy()
    expect(document.getElementById('mission-topology')?.textContent).toBe('topology slot')
    expect(document.getElementById('mission-timeline')?.textContent).toBe('timeline slot')
  })

  it('names the mission in the one h1, with its steps beside it', () => {
    layout()
    expect(screen.getByRole('heading', { level: 1, name: 'The Link That Never Went Down' })).toBeTruthy()
    expect(within(screen.getByRole('list', { name: 'Mission steps' })).getAllByRole('listitem')).toHaveLength(5)
  })

  it("doesn't draw a panel the mission hasn't opened, or the dividers that would resize it", () => {
    layout({ panels: { editor: false, topology: false, timeline: false } })
    expect(screen.queryByText('editor slot')).toBeNull()
    expect(screen.queryByText('topology slot')).toBeNull()
    expect(screen.queryByText('timeline slot')).toBeNull()
    expect(screen.getAllByRole('separator').map((splitter) => splitter.getAttribute('aria-label'))).toEqual([
      'Resize the Guide',
    ])
    expect(screen.getByText('terminal slot')).toBeTruthy()
  })

  it('opens the network dock for the timeline alone', () => {
    layout({ panels: { editor: false, topology: false, timeline: true } })
    expect(screen.getByText('timeline slot')).toBeTruthy()
    expect(screen.queryByText('topology slot')).toBeNull()
    expect(screen.getByRole('separator', { name: 'Resize the network' })).toBeTruthy()
  })

  it('resizes a panel from the keyboard, and puts its default back on a double-click', () => {
    const onResize = vi.fn()
    layout({ panelSizes: { sizes: { guide: 20, network: null, editor: null }, onResize } })
    const splitter = screen.getByRole('separator', { name: 'Resize the Guide' })
    expect(splitter.getAttribute('aria-valuenow')).toBe('20')
    fireEvent.keyDown(splitter, { key: 'End' })
    expect(onResize).toHaveBeenLastCalledWith('guide', 34)
    fireEvent.doubleClick(splitter)
    expect(onResize).toHaveBeenLastCalledWith('guide', null)
  })

  it('says whose shell the terminal is, or what the Machine is doing instead', () => {
    layout()
    expect(within(screen.getByRole('region', { name: 'Terminal' })).getByRole('status').textContent).toBe('router a')
    cleanup()
    layout({ terminalStatus: 'Building the network' })
    expect(within(screen.getByRole('region', { name: 'Terminal' })).getByRole('status').textContent).toBe(
      'Building the network'
    )
  })

  it('lays the debrief over the workspace and the network, and takes them out of reach', () => {
    layout({ debrief: <p>debrief slot</p> })
    expect(screen.getByText('debrief slot')).toBeTruthy()
    expect(document.getElementById('mission-workspace')?.hasAttribute('inert')).toBe(true)
    expect(document.getElementById('mission-network')?.hasAttribute('inert')).toBe(true)
    // The Guide stays in reach: it holds the way on.
    expect(document.getElementById('mission-guide')?.hasAttribute('inert')).toBe(false)
  })

  it('asks before it starts the mission again', () => {
    const onRestart = vi.fn()
    const onConfirm = vi.fn()
    layout({
      bar: { ...MISSION_LAYOUT.bar, onRestart },
      restart: { open: true, onConfirm, onCancel: () => {} },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Start this mission again' }))
    expect(onRestart).toHaveBeenCalledTimes(1)
    const dialog = screen.getByRole('dialog', { name: 'Start this mission again?' })
    expect(dialog.textContent).toContain('nothing is timed')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Start again' }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('shows where the Machine is in the status bar, and opens the shortcuts from it', () => {
    const onShortcuts = vi.fn()
    layout({ status: { ...MISSION_LAYOUT.status, machine: 'Network: starting', onShortcuts } })
    expect(screen.getByText('Network: starting')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Shortcuts ?' }))
    expect(onShortcuts).toHaveBeenCalledTimes(1)
  })

  it("gives a mission that can't be played a plain reason and a way back, never a dead end", () => {
    render(
      <MissionScreenPresentation layout={null} unavailable={{ reason: 'It is still being built.', titleHref: '#/' }} />
    )
    expect(screen.getByRole('heading', { level: 1, name: "This mission can't be played yet." })).toBeTruthy()
    expect(screen.getByText('It is still being built.')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Back to the title' }).getAttribute('href')).toBe('#/')
  })

  it('draws nothing while the mission is being opened', () => {
    const { container } = render(<MissionScreenPresentation layout={null} unavailable={null} />)
    expect(container.innerHTML).toBe('')
  })
})
