import { afterEach, describe, expect, it } from 'vitest'
import { configureTheme, resetThemeConfig } from '#config'
import { DURATION_MS } from '#motion/motion.constants'
import { DAY_PRINT } from '#palettes/day-print.palette'
import { NIGHT_PRINT } from '#palettes/night-print.palette'
import { paletteVariables, sharedVariables, toCssDeclarations } from '#utils/css/css-variables.util'

describe('paletteVariables', () => {
  it('names every token with a leading -- and keeps its value', () => {
    const variables = paletteVariables(DAY_PRINT)
    expect(variables['--ink']).toBe('#141414')
    expect(variables['--ink-2']).toBe('#55554f')
    expect(Object.keys(variables)).toHaveLength(Object.keys(DAY_PRINT).length)
  })

  it('gives both prints the same set of tokens', () => {
    expect(Object.keys(paletteVariables(NIGHT_PRINT))).toEqual(Object.keys(paletteVariables(DAY_PRINT)))
  })
})

describe('sharedVariables', () => {
  afterEach(() => resetThemeConfig())

  it('draws rules in ink and gives every duration in ms', () => {
    const variables = sharedVariables()
    expect(variables['--rule']).toBe('2px solid var(--ink)')
    expect(variables['--rule-thin']).toBe('1px solid var(--ink)')
    for (const [name, ms] of Object.entries(DURATION_MS)) {
      expect(variables[`--t-${name}`]).toBe(`${ms}ms`)
    }
  })

  it('uses the configured UI scale unless one is passed', () => {
    expect(sharedVariables()['--ui-scale']).toBe('1')
    configureTheme({ defaultUiScale: 1.25 })
    expect(sharedVariables()['--ui-scale']).toBe('1.25')
    expect(sharedVariables(0.9)['--ui-scale']).toBe('0.9')
  })
})

describe('toCssDeclarations', () => {
  it('writes one declaration per line', () => {
    expect(toCssDeclarations({ '--ink': '#141414', '--t-fast': '150ms' })).toBe('--ink: #141414;\n--t-fast: 150ms;')
  })
})
