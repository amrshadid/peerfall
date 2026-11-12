import { afterEach, describe, expect, it } from 'vitest'
import { configureTheme, getThemeConfig, resetThemeConfig } from '#config'
import { DEFAULT_UI_SCALE } from '#spacing/index'

describe('theme config', () => {
  afterEach(() => resetThemeConfig())

  it('starts from the Section 2 defaults', () => {
    expect(getThemeConfig()).toEqual({ defaultPrint: 'day', defaultUiScale: DEFAULT_UI_SCALE })
  })

  it("keeps defaults for options that aren't passed", () => {
    configureTheme({ defaultPrint: 'night' })
    expect(getThemeConfig()).toEqual({ defaultPrint: 'night', defaultUiScale: DEFAULT_UI_SCALE })
  })

  it('resets to the defaults', () => {
    configureTheme({ defaultPrint: 'night', defaultUiScale: 1.25 })
    resetThemeConfig()
    expect(getThemeConfig().defaultPrint).toBe('day')
  })
})
