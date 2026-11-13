import { describe, expect, it } from 'vitest'
import { panelsOfStep, previousStepOf } from './mission-step.util'

describe('previousStepOf', () => {
  const done = ['scene', 'see', 'build'] as const

  it('goes from the current step to the last done one, then one back each time', () => {
    expect(previousStepOf(done, null)).toBe('build')
    expect(previousStepOf(done, 'build')).toBe('see')
    expect(previousStepOf(done, 'see')).toBe('scene')
  })

  it('stops at the first step, and has nothing before the scene', () => {
    expect(previousStepOf(done, 'scene')).toBeNull()
    expect(previousStepOf([], null)).toBeNull()
  })
})

describe('panelsOfStep', () => {
  it('opens the map with the scene, the timeline with See it and the editor with Build it', () => {
    expect(panelsOfStep('scene')).toEqual({ topology: true, timeline: false, editor: false })
    expect(panelsOfStep('see')).toEqual({ topology: true, timeline: true, editor: false })
    expect(panelsOfStep('build')).toEqual({ topology: true, timeline: true, editor: true })
    expect(panelsOfStep('debrief')).toEqual({ topology: true, timeline: true, editor: true })
  })

  it('has no timeline and no editor in a mission that breaks nothing', () => {
    expect(panelsOfStep('see', false)).toEqual({ topology: true, timeline: false, editor: false })
    expect(panelsOfStep('build', false)).toEqual({ topology: true, timeline: false, editor: false })
  })
})
