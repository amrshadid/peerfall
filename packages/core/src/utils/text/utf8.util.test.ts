import { describe, expect, it } from 'vitest'
import { utf8Encode } from '#utils/text/utf8.util'

describe('utf8Encode', () => {
  it.each([
    ['A', [0x41]],
    ['é', [0xc3, 0xa9]],
    ['€', [0xe2, 0x82, 0xac]],
    ['🐧', [0xf0, 0x9f, 0x90, 0xa7]],
  ])('encodes %s', (text, expected) => {
    expect([...utf8Encode(text)]).toEqual(expected)
  })

  it.each([
    ['a lone high surrogate', '\ud83d'],
    ['a lone low surrogate', '\udc27'],
  ])('encodes %s as U+FFFD, like TextEncoder', (_, text) => {
    expect([...utf8Encode(`x${text}y`)]).toEqual([0x78, 0xef, 0xbf, 0xbd, 0x79])
  })
})
