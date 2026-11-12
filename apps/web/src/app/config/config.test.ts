import { afterEach, describe, expect, it } from 'vitest'
import { appConfig, clarityIdOf, configureApp, resetAppConfig } from './config'

afterEach(resetAppConfig)

describe('app config', () => {
  it('has no Clarity id until one is configured', () => {
    expect(appConfig().clarityId).toBeNull()
    configureApp()
    expect(appConfig().clarityId).toBeNull()
    configureApp({ clarityId: 'abc123xyz9' })
    expect(appConfig().clarityId).toBe('abc123xyz9')
  })

  it('refuses an id that is empty or could change the script URL', () => {
    expect(clarityIdOf(undefined)).toBeNull()
    expect(clarityIdOf('  ')).toBeNull()
    expect(clarityIdOf('abc/../evil')).toBeNull()
    expect(clarityIdOf('abc?x=1')).toBeNull()
    expect(clarityIdOf(' abc123 ')).toBe('abc123')
  })

  it('serves no dev routes until it is told to', () => {
    expect(appConfig().devRoutes).toBe(false)
    configureApp({ devRoutes: true })
    expect(appConfig().devRoutes).toBe(true)
    resetAppConfig()
    expect(appConfig().devRoutes).toBe(false)
  })
})
