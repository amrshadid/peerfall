// @vitest-environment jsdom
import { FIRST_MISSION, journeyFixture } from '@features/map/utils/fixtures'
import { journeyChapters } from '@features/map/utils/journey'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MapOverview } from './MapOverview'

const DESCRIPTION = 'You are at 4.1 The Link That Never Went Down, in stage 4, Recover from failure. Open the Peer Map.'

function stubSize(width: number, height: number) {
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(width)
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(height)
}

beforeEach(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    }
  )
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('MapOverview', () => {
  const chapters = journeyChapters(journeyFixture(), FIRST_MISSION)

  it('is one link to the map, named by where the player stands, before it has a size to draw at', () => {
    stubSize(0, 0)
    const view = render(<MapOverview chapters={chapters} href="#/map" />)
    const link = screen.getByRole('link', { name: DESCRIPTION })
    expect(link.getAttribute('href')).toBe('#/map')
    expect(view.container.querySelector('svg')).toBeNull()
  })

  it('draws the journey as one image with the same description once it has a size', () => {
    stubSize(460, 400)
    render(<MapOverview chapters={chapters} href="#/map" />)
    const image = screen.getByRole('img', { name: DESCRIPTION })
    expect(image.getAttribute('height')).toBe('400')
    expect(screen.getByRole('link').contains(image)).toBe(true)
    expect(image.querySelector('[role="button"]')).toBeNull()
  })

  it('is a plain figure with no link where it has nowhere to go, and takes a description of its own', () => {
    stubSize(460, 400)
    render(<MapOverview chapters={chapters} href={null} description="The journey so far." />)
    expect(screen.queryByRole('link')).toBeNull()
    expect(screen.getByRole('img', { name: 'The journey so far.' })).toBeTruthy()
  })
})
