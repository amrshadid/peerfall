// @vitest-environment jsdom
import type { TopologyPresentationProps } from '@features/topology/types'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { TRIANGLE } from '@/test/fixtures/network.fixture'
import { TopologyPresentation } from './TopologyPresentation'

afterEach(cleanup)

function topology(overrides: Partial<TopologyPresentationProps> = {}) {
  const props: TopologyPresentationProps = {
    network: TRIANGLE,
    linkStates: [],
    activePath: null,
    selectedRouter: null,
    onSelectRouter: vi.fn(),
    ...overrides,
  }
  render(<TopologyPresentation {...props} />)
  return props
}

const router = (name: string) => screen.getByRole('button', { name: new RegExp(`^Router ${name}\\b`) })

describe('TopologyPresentation', () => {
  it('draws every router as a real button, named with its address', () => {
    topology()
    const routers = within(screen.getByRole('group', { name: 'Routers' })).getAllByRole('button')
    expect(routers.map((button) => button.tagName)).toEqual(['BUTTON', 'BUTTON', 'BUTTON'])
    expect(routers.map((button) => button.getAttribute('aria-label'))).toEqual([
      'Router a, 10.255.0.1',
      'Router b, 10.255.0.2',
      'Router c, 10.255.0.3',
    ])
  })

  it('selects a router when it is clicked', () => {
    const { onSelectRouter } = topology()
    fireEvent.click(router('b'))
    expect(onSelectRouter).toHaveBeenCalledWith('b')
  })

  it('says which router the terminal is in, in words and to assistive tech', () => {
    topology({ selectedRouter: 'c' })
    expect(router('c').getAttribute('aria-pressed')).toBe('true')
    expect(router('c').getAttribute('aria-label')).toBe('Router c, 10.255.0.3, the terminal is here')
    expect(within(router('c')).getByText('terminal')).toBeTruthy()
    expect(router('a').getAttribute('aria-pressed')).toBe('false')
  })

  it('walks the routers with the arrow keys, wrapping, and jumps with Home and End', () => {
    topology()
    const group = screen.getByRole('group', { name: 'Routers' })
    router('a').focus()
    fireEvent.keyDown(group, { key: 'ArrowRight' })
    expect(document.activeElement).toBe(router('b'))
    fireEvent.keyDown(group, { key: 'ArrowDown' })
    expect(document.activeElement).toBe(router('c'))
    fireEvent.keyDown(group, { key: 'ArrowRight' })
    expect(document.activeElement).toBe(router('a'))
    fireEvent.keyDown(group, { key: 'ArrowLeft' })
    expect(document.activeElement).toBe(router('c'))
    fireEvent.keyDown(group, { key: 'Home' })
    expect(document.activeElement).toBe(router('a'))
    fireEvent.keyDown(group, { key: 'End' })
    expect(document.activeElement).toBe(router('c'))
  })

  it('leaves every router in the tab order, and other keys alone', () => {
    topology()
    for (const name of ['a', 'b', 'c']) {
      expect(router(name).tabIndex).toBe(0)
    }
    router('a').focus()
    const event = fireEvent.keyDown(screen.getByRole('group', { name: 'Routers' }), { key: 'x' })
    expect(event).toBe(true)
    expect(document.activeElement).toBe(router('a'))
  })

  it("says each link's state in words, with an icon, never by its line alone", () => {
    topology({
      linkStates: [
        { link: ['a', 'c'], state: 'dropping' },
        { link: ['b', 'c'], state: 'down' },
      ],
    })
    const links = within(screen.getByRole('list', { name: 'Links' })).getAllByRole('listitem')
    expect(links.map((item) => item.textContent)).toEqual([
      'Link a to b: up',
      'Link a to c: dropping packets',
      'Link b to c: down',
    ])
    for (const item of links) {
      expect(item.querySelector('svg')).not.toBeNull()
    }
  })

  it('states the path in text and marks its links for assistive tech', () => {
    topology({
      linkStates: [{ link: ['a', 'c'], state: 'dropping' }],
      activePath: ['a', 'b', 'c'],
      pathLabel: 'Probe a → c takes',
    })
    expect(screen.getByRole('status').textContent).toBe('Probe a → c takes a → b → c')
    const links = within(screen.getByRole('list', { name: 'Links' })).getAllByRole('listitem')
    expect(links.map((item) => item.textContent)).toEqual([
      'Link a to b: up, on the path',
      'Link a to c: dropping packets',
      'Link b to c: up, on the path',
    ])
  })

  it('says so when there is no path', () => {
    topology()
    expect(screen.getByRole('status').textContent).toBe('Path: no path')
  })
})
