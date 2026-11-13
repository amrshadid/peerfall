import { describe, expect, it } from 'vitest'
import { panelsOfStep } from './mission-step.util'

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
