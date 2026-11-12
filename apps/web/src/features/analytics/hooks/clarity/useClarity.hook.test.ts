// @vitest-environment jsdom
import { CLARITY_DENIED, CLARITY_GRANTED, type ClarityWindow } from '@features/analytics/utils/clarity'
import type { ClarityConsent } from '@shared/types'
import { renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { useClarity } from './useClarity.hook'

const win = window as Window & ClarityWindow
const tags = () => document.querySelectorAll('script[src^="https://www.clarity.ms/tag/"]')

afterEach(() => {
  for (const tag of tags()) {
    tag.remove()
  }
  delete win.clarity
})

const render = (clarityId: string | null, consent: ClarityConsent) =>
  renderHook(({ id, answer }) => useClarity(id, answer), { initialProps: { id: clarityId, answer: consent } })

describe('useClarity', () => {
  it('loads nothing in a build without an id, even with consent', () => {
    render(null, 'granted')
    expect(tags()).toHaveLength(0)
    expect(win.clarity).toBeUndefined()
  })

  it('loads nothing before the player answers, or after "No thanks"', () => {
    render('abc123', 'unset')
    render('abc123', 'denied')
    expect(tags()).toHaveLength(0)
    expect(win.clarity).toBeUndefined()
  })

  it('loads the tag once with the analytics-only consent when the player allows it', () => {
    const { rerender } = render('abc123', 'granted')
    rerender({ id: 'abc123', answer: 'granted' })
    expect(tags()).toHaveLength(1)
    expect(win.clarity?.q).toEqual([['consentv2', CLARITY_GRANTED]])
  })

  it('withdraws consent and stops a running tag when the player changes to denied', () => {
    const { rerender } = render('abc123', 'granted')
    rerender({ id: 'abc123', answer: 'denied' })
    expect(tags()).toHaveLength(1)
    expect(win.clarity?.q).toEqual([['consentv2', CLARITY_GRANTED], ['consentv2', CLARITY_DENIED], ['stop']])
  })

  it('loads at once when the player changes from denied to granted', () => {
    const { rerender } = render('abc123', 'denied')
    expect(tags()).toHaveLength(0)
    rerender({ id: 'abc123', answer: 'granted' })
    expect(tags()).toHaveLength(1)
  })
})
