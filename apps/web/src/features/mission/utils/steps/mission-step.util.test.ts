import { MISSION_STEPS } from '@features/mission/utils/layout'
import { describe, expect, it } from 'vitest'
import { missionStepIndex, panelsOfStep } from './mission-step.util'

const facts = { phase: 'play', hasBaseline: false, hasAttempt: false, completed: false } as const

describe('missionStepIndex', () => {
  it('walks the loop by what was recorded, never by what was typed', () => {
    expect(missionStepIndex({ ...facts, phase: 'incident' })).toBe(0)
    expect(missionStepIndex(facts)).toBe(0)
    expect(missionStepIndex({ ...facts, hasBaseline: true })).toBe(1)
    expect(missionStepIndex({ ...facts, hasBaseline: true, hasAttempt: true })).toBe(2)
    expect(missionStepIndex({ ...facts, hasBaseline: true, hasAttempt: true, completed: true })).toBe(3)
  })

  it('is past every step once the debrief is open', () => {
    expect(missionStepIndex({ ...facts, phase: 'debrief', completed: true })).toBe(MISSION_STEPS.length)
  })

  it('goes straight to Verify when the first run of the fault already passes', () => {
    expect(missionStepIndex({ ...facts, hasAttempt: true, completed: true })).toBe(3)
  })
})

describe('panelsOfStep', () => {
  it('opens the map with the incident, the timeline with the network and the editor after the baseline', () => {
    expect(panelsOfStep('incident', 0)).toEqual({ topology: true, timeline: false, editor: false })
    expect(panelsOfStep('play', 0)).toEqual({ topology: true, timeline: true, editor: false })
    expect(panelsOfStep('play', 1)).toEqual({ topology: true, timeline: true, editor: true })
    expect(panelsOfStep('debrief', 4)).toEqual({ topology: true, timeline: true, editor: true })
  })

  it('has no timeline in a mission that breaks nothing, and opens its editor with the network', () => {
    expect(panelsOfStep('incident', 0, false)).toEqual({ topology: true, timeline: false, editor: false })
    expect(panelsOfStep('play', 0, false)).toEqual({ topology: true, timeline: false, editor: true })
  })
})
