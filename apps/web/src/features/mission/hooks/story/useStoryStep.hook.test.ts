// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { type StoryStepInput, useStoryStep } from './useStoryStep.hook'

afterEach(cleanup)

const input = (overrides: Partial<StoryStepInput> = {}): StoryStepInput => ({
  key: 'm#0',
  phase: 'play',
  passed: false,
  buildRead: false,
  ...overrides,
})

describe('useStoryStep', () => {
  it('keeps Build it while its transcript is unread, though every objective is met', () => {
    const { result, rerender } = renderHook((props: StoryStepInput) => useStoryStep(props), {
      initialProps: input(),
    })
    act(() => result.current.goTo('build'))
    rerender(input({ passed: true }))
    expect(result.current.step).toBe('build')

    rerender(input({ passed: true, buildRead: true }))
    expect(result.current.step).toBe('watch')
  })

  it('moves on once Build it is read and the last objective is met', () => {
    const { result, rerender } = renderHook((props: StoryStepInput) => useStoryStep(props), {
      initialProps: input(),
    })
    act(() => result.current.goTo('build'))
    rerender(input({ buildRead: true }))
    expect(result.current.step).toBe('build')
    rerender(input({ buildRead: true, passed: true }))
    expect(result.current.step).toBe('watch')
  })
})
