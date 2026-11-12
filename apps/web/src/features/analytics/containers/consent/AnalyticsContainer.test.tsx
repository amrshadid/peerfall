// @vitest-environment jsdom
import { configureApp, resetAppConfig } from '@app/config'
import { useAppStore } from '@app/store'
import { CLARITY_GRANTED, type ClarityWindow } from '@features/analytics/utils/clarity'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { AnalyticsContainer } from './AnalyticsContainer'

const win = window as Window & ClarityWindow
const tags = () => document.querySelectorAll('script[src^="https://www.clarity.ms/tag/"]')
const notice = () => screen.queryByRole('complementary', { name: 'Help improve Peerfall?' })

afterEach(() => {
  cleanup()
  resetAppConfig()
  useAppStore.getState().resetSettings()
  for (const tag of tags()) {
    tag.remove()
  }
  delete win.clarity
})

describe('AnalyticsContainer', () => {
  it('neither asks nor loads Clarity in a build without an id', () => {
    render(<AnalyticsContainer />)
    expect(screen.queryByRole('complementary')).toBeNull()
    expect(tags()).toHaveLength(0)
  })

  it('asks a player who has not chosen, without taking focus or loading Clarity', () => {
    configureApp({ clarityId: 'abc123' })
    render(<AnalyticsContainer />)
    expect(notice()).not.toBeNull()
    expect(notice()?.contains(document.activeElement)).toBe(false)
    expect(screen.getByRole('link', { name: "What's recorded?" }).getAttribute('href')).toBe('#/settings/privacy')
    expect(tags()).toHaveLength(0)
  })

  it('loads Clarity and hides the notice after Allow', () => {
    configureApp({ clarityId: 'abc123' })
    render(<AnalyticsContainer />)
    fireEvent.click(screen.getByRole('button', { name: 'Allow' }))
    expect(useAppStore.getState().clarityConsent).toBe('granted')
    expect(notice()).toBeNull()
    expect(tags()).toHaveLength(1)
    expect(win.clarity?.q).toEqual([['consentv2', CLARITY_GRANTED]])
  })

  it('loads nothing and hides the notice after No thanks', () => {
    configureApp({ clarityId: 'abc123' })
    render(<AnalyticsContainer />)
    fireEvent.click(screen.getByRole('button', { name: 'No thanks' }))
    expect(useAppStore.getState().clarityConsent).toBe('denied')
    expect(notice()).toBeNull()
    expect(tags()).toHaveLength(0)
    expect(win.clarity).toBeUndefined()
  })
})
