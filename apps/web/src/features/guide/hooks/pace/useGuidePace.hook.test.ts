// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useGuidePace } from './useGuidePace.hook'

describe('useGuidePace', () => {
  it('starts on the first beat and shows one more each time it advances', () => {
    const { result } = renderHook(() => useGuidePace('m#see'))
    expect(result.current.shown).toBe(1)
    act(() => result.current.advance())
    act(() => result.current.advance())
    expect(result.current.shown).toBe(3)
  })

  it('records an answer and jumps to the beat it brings', () => {
    const { result } = renderHook(() => useGuidePace('m#see'))
    act(() => result.current.pick(0, 1, 2))
    expect(result.current).toMatchObject({ shown: 2, picks: { 0: 1 } })
  })

  it('starts over on a new step', () => {
    const { result, rerender } = renderHook(({ key }) => useGuidePace(key), { initialProps: { key: 'm#see' } })
    act(() => result.current.advance())
    rerender({ key: 'm#build' })
    expect(result.current).toMatchObject({ shown: 1, picks: {} })
    act(() => result.current.advance())
    expect(result.current.shown).toBe(2)
  })
})
