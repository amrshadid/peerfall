import { afterEach, describe, expect, it, vi } from 'vitest'
import { isMacPlatform } from './platform.util'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('isMacPlatform', () => {
  it('is true on macOS and iOS', () => {
    vi.stubGlobal('navigator', { platform: 'MacIntel', userAgent: '' })
    expect(isMacPlatform()).toBe(true)
    vi.stubGlobal('navigator', { platform: 'iPad', userAgent: '' })
    expect(isMacPlatform()).toBe(true)
  })

  it('is false elsewhere', () => {
    vi.stubGlobal('navigator', { platform: 'Linux x86_64', userAgent: '' })
    expect(isMacPlatform()).toBe(false)
  })

  it('reads the user agent when the platform is empty', () => {
    vi.stubGlobal('navigator', { platform: '', userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0)' })
    expect(isMacPlatform()).toBe(true)
  })

  it('is false without a navigator', () => {
    vi.stubGlobal('navigator', undefined)
    expect(isMacPlatform()).toBe(false)
  })
})
