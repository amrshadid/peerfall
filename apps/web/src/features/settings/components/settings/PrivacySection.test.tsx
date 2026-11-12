// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PrivacySection } from './PrivacySection'

afterEach(cleanup)

const pressed = (name: string) => screen.getByRole('button', { name }).getAttribute('aria-pressed')

describe('PrivacySection', () => {
  it('says nothing is chosen yet when the player has not answered', () => {
    render(<PrivacySection clarityConfigured consent="unset" onChange={() => {}} />)
    expect(screen.getByText(/Not chosen yet/)).toBeTruthy()
    expect(pressed('Allow')).toBe('false')
    expect(pressed("Don't allow")).toBe('false')
  })

  it('shows the answer and changes it both ways', () => {
    const onChange = vi.fn()
    render(<PrivacySection clarityConfigured consent="granted" onChange={onChange} />)
    expect(pressed('Allow')).toBe('true')
    fireEvent.click(screen.getByRole('button', { name: "Don't allow" }))
    expect(onChange).toHaveBeenLastCalledWith({ clarityConsent: 'denied' })
    fireEvent.click(screen.getByRole('button', { name: 'Allow' }))
    expect(onChange).toHaveBeenLastCalledWith({ clarityConsent: 'granted' })
  })

  it('names the cookies and links the privacy statement', () => {
    render(<PrivacySection clarityConfigured consent="denied" onChange={() => {}} />)
    expect(screen.getByText(/_clck and _clsk/)).toBeTruthy()
    expect(screen.getByRole('link', { name: 'privacy statement' }).getAttribute('href')).toBe(
      'https://privacy.microsoft.com/privacystatement'
    )
  })

  it('offers no choice in a copy without a recording service', () => {
    render(<PrivacySection clarityConfigured={false} consent="unset" onChange={() => {}} />)
    expect(screen.queryByRole('button')).toBeNull()
    expect(screen.getByText('Nothing: this copy of the game records nothing.')).toBeTruthy()
  })
})
