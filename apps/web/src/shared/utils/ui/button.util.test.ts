import { describe, expect, it } from 'vitest'
import { buttonClass } from './button.util'

describe('buttonClass', () => {
  it('combines the variant, the size and any extra class', () => {
    expect(buttonClass('primary', 'lg', 'x')).toBe('pf-btn pf-btn--primary pf-btn--lg x')
  })

  it('leaves out a missing extra class', () => {
    expect(buttonClass('quiet', 'md', undefined)).toBe('pf-btn pf-btn--quiet pf-btn--md')
  })
})
