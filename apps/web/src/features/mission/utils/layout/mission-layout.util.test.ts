import { describe, expect, it } from 'vitest'
import { hasNetworkDock, headerWidthRem, openPanelsKey, panelsFor, sizeVariables } from './mission-layout.util'

const LOCKED = { editor: false, topology: false, timeline: false }

describe('headerWidthRem', () => {
  it("measures from the panel's left edge to the header's rule, in rem", () => {
    expect(headerWidthRem({ headerRight: 338, ruleWidth: 2, panelLeft: 16, remPx: 16 })).toBe(20)
  })

  it('is null until both are laid out', () => {
    expect(headerWidthRem({ headerRight: 0, ruleWidth: 0, panelLeft: 0, remPx: 16 })).toBeNull()
    expect(headerWidthRem({ headerRight: 300, ruleWidth: 2, panelLeft: 16, remPx: 0 })).toBeNull()
  })
})

describe('the panels the mission has opened', () => {
  it('shows the network dock once the topology or the timeline is open', () => {
    expect(hasNetworkDock(LOCKED)).toBe(false)
    expect(hasNetworkDock({ ...LOCKED, topology: true })).toBe(true)
    expect(hasNetworkDock({ ...LOCKED, timeline: true })).toBe(true)
  })

  it('names the open panels in one string that changes when another opens', () => {
    expect(openPanelsKey(LOCKED)).toBe('guide,terminal')
    expect(openPanelsKey({ editor: true, topology: true, timeline: false })).toBe('guide,terminal,editor,topology')
  })

  it('opens every panel for a player who asked to see them all', () => {
    expect(panelsFor(LOCKED, false)).toBe(LOCKED)
    expect(panelsFor(LOCKED, true)).toEqual({ editor: true, topology: true, timeline: true })
  })
})

describe('sizeVariables', () => {
  it('sets only the sizes the player chose, so every other panel keeps its default', () => {
    expect(sizeVariables({ guide: null, network: null, editor: null }, 15)).toEqual({ '--guide-min': '15rem' })
    expect(sizeVariables({ guide: 24, network: 30, editor: 55 }, 18.5)).toEqual({
      '--guide-min': '18.5rem',
      '--guide-w': '24rem',
      '--network-w': '30rem',
      '--editor-share': '55%',
    })
  })
})
