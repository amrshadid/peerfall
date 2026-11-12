// @vitest-environment jsdom
import { useAppStore } from '@app/store'
import { NOTICE_MS, saveFailedNotice } from '@features/notices/utils/notices'
import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NoticesContainer } from './NoticesContainer'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  for (const { id } of useAppStore.getState().notices) {
    useAppStore.getState().dismissNotice(id)
  }
})

describe('NoticesContainer', () => {
  it('shows a notice from the store and lets it fade on its own', () => {
    render(<NoticesContainer />)
    act(() => {
      useAppStore
        .getState()
        .showNotice({ id: 'n1', kind: 'info', kicker: 'Note', text: 'Saved run kept.', sticky: false })
    })
    expect(screen.getByText('Saved run kept.')).toBeTruthy()
    act(() => {
      vi.advanceTimersByTime(NOTICE_MS)
    })
    expect(screen.queryByText('Saved run kept.')).toBeNull()
  })

  it('keeps a failed save on show until the player dismisses it', () => {
    render(<NoticesContainer />)
    act(() => {
      useAppStore.getState().showNotice(saveFailedNotice(1))
    })
    act(() => {
      vi.advanceTimersByTime(NOTICE_MS * 3)
    })
    expect(screen.getByText('Not saved')).toBeTruthy()
  })
})
