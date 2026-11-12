import { DAY_PRINT, NIGHT_PRINT } from '@peerfall/theme/palettes'
import { paletteVariables, sharedVariables } from '@peerfall/theme/utils'
import { describe, expect, it } from 'vitest'

interface NodeFs {
  readFileSync(path: URL, encoding: 'utf8'): string
}

// Read from disk: Vitest replaces every CSS import, `?raw` included, with an empty string. The
// app's tsconfig has no Node types, so `node:fs` is imported by name and typed here.
const NODE_FS = 'node:fs'
const { readFileSync }: NodeFs = await import(/* @vite-ignore */ NODE_FS)
const css = readFileSync(new URL('./theme.css', import.meta.url), 'utf8')

const DECLARATION = /(--[\w-]+)\s*:\s*([^;]+);/g

/** The custom properties declared in the first rule whose selector is exactly `selector`. */
function customPropertiesOf(selector: string): Record<string, string> {
  const open = css.indexOf(`${selector} {`)
  if (open === -1) {
    throw new Error(`theme.css has no rule for ${selector}`)
  }
  const body = css.slice(open, css.indexOf('}', open))
  return Object.fromEntries([...body.matchAll(DECLARATION)].map(([, name, value]) => [name, value?.trim()]))
}

// theme.css is written by hand so the first paint needs no script; this keeps it in step with
// @peerfall/theme, the source of truth for the Section 2 tokens.
describe('theme.css', () => {
  it('declares Day print and the shared tokens on :root, exactly as @peerfall/theme has them', () => {
    expect(customPropertiesOf(':root')).toEqual({ ...paletteVariables(DAY_PRINT), ...sharedVariables() })
  })

  it('declares Night print, chosen or followed from the system, exactly as @peerfall/theme has it', () => {
    const night = paletteVariables(NIGHT_PRINT)
    expect(customPropertiesOf(':root[data-theme="dark"]')).toEqual(night)
    expect(customPropertiesOf(':root:not([data-theme="light"])')).toEqual(night)
  })
})
