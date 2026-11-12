import { describe, expect, it } from 'vitest'
import { tokenizeInline } from './inline-text.util'

describe('tokenizeInline', () => {
  it('sets real terms in code and keeps the text around them', () => {
    expect(tokenizeInline("That's `fork`. Two of you.")).toEqual([
      { kind: 'text', text: "That's " },
      { kind: 'code', text: 'fork' },
      { kind: 'text', text: '. Two of you.' },
    ])
  })

  it('reads emphasis and strong text', () => {
    expect(tokenizeInline('a _zombie_ and **init**')).toEqual([
      { kind: 'text', text: 'a ' },
      { kind: 'em', text: 'zombie' },
      { kind: 'text', text: ' and ' },
      { kind: 'strong', text: 'init' },
    ])
  })

  it('leaves underscores inside words and code alone', () => {
    expect(tokenizeInline('call `_exit` not exit_group_x')).toEqual([
      { kind: 'text', text: 'call ' },
      { kind: 'code', text: '_exit' },
      { kind: 'text', text: ' not exit_group_x' },
    ])
  })
})
