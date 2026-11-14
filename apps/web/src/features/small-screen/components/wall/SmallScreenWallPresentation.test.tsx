// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { SmallScreenWallPresentation } from './SmallScreenWallPresentation'

afterEach(cleanup)

describe('SmallScreenWallPresentation', () => {
  it('says the game needs a bigger screen and how wide', () => {
    render(<SmallScreenWallPresentation minWidthPx={1024} />)
    expect(screen.getByRole('heading', { level: 1, name: 'Peerfall needs a bigger screen.' })).toBeTruthy()
    expect(screen.getByText(/at least 1024 pixels wide/)).toBeTruthy()
  })

  it('says what the game is, and keeps the width it needs out of search snippets', () => {
    render(<SmallScreenWallPresentation minWidthPx={1024} />)
    expect(screen.getByText(/free, open-source game that teaches FRRouting/).closest('[data-nosnippet]')).toBeNull()
    expect(screen.getByText(/at least 1024 pixels wide/).closest('[data-nosnippet]')).not.toBeNull()
  })

  it('offers no way past the wall: no button, no link', () => {
    render(<SmallScreenWallPresentation minWidthPx={1024} />)
    expect(screen.queryAllByRole('button')).toEqual([])
    expect(screen.queryAllByRole('link')).toEqual([])
  })
})
