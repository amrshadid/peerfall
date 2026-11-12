// @vitest-environment jsdom
import { useAppStore } from '@app/store'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { SettingsContainer } from './SettingsContainer'

vi.mock('@features/tour/utils/driver', () => ({
  isTourActive: () => false,
  isOnScreen: () => false,
  playTour: () => {},
  stopTour: () => {},
}))

beforeAll(() => {
  // jsdom has no modal dialogs; the screen only needs them to open and close.
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.open = true
  }
  HTMLDialogElement.prototype.close = function close() {
    this.open = false
  }
})

beforeEach(() => {
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }))
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  useAppStore.getState().resetSettings()
})

describe('SettingsContainer', () => {
  it('opens on Display, and applies a change at once', () => {
    render(<SettingsContainer section={null} />)
    expect(screen.getByRole('heading', { level: 1, name: 'Settings' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Display' }).getAttribute('aria-current')).toBe('page')
    fireEvent.click(screen.getByRole('button', { name: 'Night print' }))
    expect(useAppStore.getState().theme).toBe('dark')
  })

  it('lists every section of the manual, in order', () => {
    render(<SettingsContainer section={null} />)
    const links = screen.getByRole('navigation', { name: 'Settings sections' }).querySelectorAll('a')
    expect([...links].map((link) => link.textContent)).toEqual([
      'Display',
      'Gameplay',
      'Keyboard',
      'Saves',
      'Privacy',
      'About',
    ])
  })

  it('forgets the tours seen, and says so', () => {
    useAppStore.getState().markToursSeen(['title:start'])
    render(<SettingsContainer section="gameplay" />)
    fireEvent.click(screen.getByRole('button', { name: 'Show every tour again' }))
    expect(useAppStore.getState().toursSeen).toEqual([])
    expect(screen.getByRole('status').textContent).toBe('Tours will play again on each screen.')
  })

  it('offers export, import and a reset that has to be typed out', () => {
    render(<SettingsContainer section="saves" />)
    expect(screen.getByRole('button', { name: 'Export save' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Reset everything…' }))
    expect(screen.getByRole('button', { name: 'Reset everything' }).hasAttribute('disabled')).toBe(true)
  })

  it('says nothing is recorded in a copy without a recording service', () => {
    render(<SettingsContainer section="privacy" />)
    expect(screen.getByText('Nothing: this copy of the game records nothing.')).toBeTruthy()
  })

  it('links the source as "Show me the code", the contributing guide and the issues, with the version', () => {
    render(<SettingsContainer section="about" />)
    expect(screen.getByRole('link', { name: 'Show me the code.' }).getAttribute('href')).toBe(
      'https://github.com/amrshadid/peerfall'
    )
    expect(screen.getByRole('link', { name: 'CONTRIBUTING.md' }).getAttribute('href')).toBe(
      'https://github.com/amrshadid/peerfall/blob/main/CONTRIBUTING.md'
    )
    expect(screen.getByRole('link', { name: 'issue' }).getAttribute('href')).toBe(
      'https://github.com/amrshadid/peerfall/issues'
    )
    expect(screen.getAllByText(/^Peerfall \d+\.\d+\.\d+/).length).toBeGreaterThan(0)
    expect(document.body.textContent).not.toMatch(/simulat/i)
  })
})
