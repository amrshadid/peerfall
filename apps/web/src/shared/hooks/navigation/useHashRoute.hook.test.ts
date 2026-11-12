// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { useHashRoute } from './useHashRoute.hook'

/** Sets the hash and fires `hashchange` at once, as the browser does after a navigation. */
function goTo(hash: string): void {
  window.location.hash = hash
  window.dispatchEvent(new HashChangeEvent('hashchange'))
}

afterEach(() => {
  cleanup()
  window.location.hash = ''
})

describe('useHashRoute', () => {
  it('reads the route from the hash and follows it as it changes', () => {
    goTo('#/map')
    const { result } = renderHook(() => useHashRoute())
    expect(result.current).toEqual({ name: 'map' })
    act(() => goTo('#/mission/the-link'))
    expect(result.current).toEqual({ name: 'mission', missionId: 'the-link' })
  })
})
