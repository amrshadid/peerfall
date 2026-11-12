// @vitest-environment jsdom
import type { Notice } from '@features/notices/types'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { NoticeStackPresentation } from './NoticeStackPresentation'

afterEach(cleanup)

const failed: Notice = {
  id: 'f1',
  kind: 'save-failed',
  kicker: 'Not saved',
  text: 'Kept in this tab only.',
  sticky: true,
}

describe('NoticeStackPresentation', () => {
  it('keeps a polite live region on the page even with nothing to say', () => {
    render(<NoticeStackPresentation notice={null} waiting={0} onDismiss={() => {}} />)
    expect(screen.getByRole('region', { name: 'Notices' }).getAttribute('aria-live')).toBe('polite')
  })

  it('says what happened in words, how many more wait, and dismisses by id', () => {
    const onDismiss = vi.fn()
    render(<NoticeStackPresentation notice={failed} waiting={2} onDismiss={onDismiss} />)
    expect(screen.getByText('Not saved')).toBeTruthy()
    expect(screen.getByText('Kept in this tab only.')).toBeTruthy()
    expect(screen.getByText('+2 more')).toBeTruthy()
    screen.getByRole('button', { name: 'Dismiss: Not saved' }).click()
    expect(onDismiss).toHaveBeenCalledWith('f1')
  })
})
