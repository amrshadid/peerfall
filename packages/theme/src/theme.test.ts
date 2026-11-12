import { describe, expect, it } from 'vitest'
import { DAY_PRINT, NIGHT_PRINT } from '#palettes/index'
import { PRINTS, theme } from '#theme'

describe('theme', () => {
  it('names each print', () => {
    expect(PRINTS).toEqual({ day: DAY_PRINT, night: NIGHT_PRINT })
    expect(theme.prints).toBe(PRINTS)
  })

  it('gives both prints the same tokens, so switching never leaves one undefined', () => {
    expect(Object.keys(NIGHT_PRINT).sort()).toEqual(Object.keys(DAY_PRINT).sort())
  })

  it('is square-cut and draws icons with the rule weight', () => {
    expect(theme.radius).toBe(0)
    expect(theme.icon.stroke).toBe(theme.rule.width)
  })
})
