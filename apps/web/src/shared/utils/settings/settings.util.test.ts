import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS, MAX_TOURS_SEEN } from './settings.constants'
import { migrateSettings, parseSettings, readPanelSizes, readSettings, settingsOf } from './settings.util'

describe('parseSettings', () => {
  it('gives the defaults for nothing stored or broken JSON', () => {
    expect(parseSettings(null)).toEqual(DEFAULT_SETTINGS)
    expect(parseSettings('{oops')).toEqual(DEFAULT_SETTINGS)
  })

  it('keeps valid fields and defaults the invalid ones', () => {
    expect(parseSettings(JSON.stringify({ theme: 'dark', motion: 'fast', uiScale: 1.25, extra: 1 }))).toEqual({
      ...DEFAULT_SETTINGS,
      theme: 'dark',
      uiScale: 1.25,
    })
  })

  it('only accepts the offered UI scale steps', () => {
    expect(parseSettings(JSON.stringify({ uiScale: 9 })).uiScale).toBe(1)
  })
})

describe('readSettings', () => {
  it('gives the defaults for anything that is not an object', () => {
    expect(readSettings(7)).toEqual(DEFAULT_SETTINGS)
    expect(readSettings(null)).toEqual(DEFAULT_SETTINGS)
  })

  it('keeps tour ids once each, drops foreign ones and caps the list', () => {
    expect(readSettings({ toursSeen: ['a', 'a', 3, 'x'.repeat(100), 'b'] }).toursSeen).toEqual(['a', 'b'])
    const many = Array.from({ length: MAX_TOURS_SEEN + 5 }, (_, i) => `t${i}`)
    expect(readSettings({ toursSeen: many }).toursSeen).toHaveLength(MAX_TOURS_SEEN)
  })
})

describe('migrateSettings', () => {
  it('reads an older value field by field', () => {
    expect(migrateSettings({ theme: 'dark', gone: true }, 0)).toEqual({ ...DEFAULT_SETTINGS, theme: 'dark' })
  })
})

describe('readPanelSizes', () => {
  it('keeps sizes inside their limits and defaults the rest, so a stale save never squeezes a panel shut', () => {
    expect(readPanelSizes({ guide: 24, network: 99, editor: 'big' })).toEqual({
      guide: 24,
      network: null,
      editor: null,
    })
    expect(readPanelSizes(null)).toEqual(DEFAULT_SETTINGS.panelSizes)
  })
})

describe('settingsOf', () => {
  it('keeps the settings and leaves everything else in the state out', () => {
    const state = { ...DEFAULT_SETTINGS, theme: 'dark' as const, cheatSheetOpen: true }
    expect(settingsOf(state)).toEqual({ ...DEFAULT_SETTINGS, theme: 'dark' })
  })
})
