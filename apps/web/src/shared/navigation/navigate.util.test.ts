// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { navigateTo } from './navigate.util'

afterEach(() => {
  window.location.hash = ''
})

describe('navigateTo', () => {
  it('moves the hash to the route', () => {
    navigateTo({ name: 'mission', missionId: 'the-link' })
    expect(window.location.hash).toBe('#/mission/the-link')
  })
})
