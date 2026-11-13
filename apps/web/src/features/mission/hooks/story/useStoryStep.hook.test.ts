// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { type StoryStepInput, useStoryStep } from './useStoryStep.hook'

afterEach(cleanup)

const input = (overrides: Partial<StoryStepInput> = {}): StoryStepInput => ({
  key: 'm#0',
  phase: 'play',
  passed: false,
  ...overrides,
})

describe('useStoryStep', () => {
  it('stays on Build it once every objective is met, so its last beat is read; the player moves on', () => {
    const { result, rerender } = renderHook((props: StoryStepInput) => useStoryStep(props), {
      initialProps: input(),
    })
    act(() => result.current.goTo('build'))
    rerender(input({ passed: true }))
    expect(result.current.step).toBe('build')

    act(() => result.current.goTo('watch'))
    expect(result.current.step).toBe('watch')
  })

  it('starts a new run over at See it', () => {
    const { result, rerender } = renderHook((props: StoryStepInput) => useStoryStep(props), {
      initialProps: input(),
    })
    act(() => result.current.goTo('watch'))
    rerender(input({ key: 'm#1' }))
    expect(result.current.step).toBe('see')
  })
})
