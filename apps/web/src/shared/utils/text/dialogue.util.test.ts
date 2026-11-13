import type { Speaker } from '@shared/types'
import { describe, expect, it } from 'vitest'
import { groupLines } from './dialogue.util'

const speaker = (id: string): Speaker => ({
  id,
  name: id,
  term: '',
  portrait: null,
  avatar: null,
})

describe('groupLines', () => {
  it('joins consecutive lines by the same speaker', () => {
    const zebra = speaker('zebra')
    const watchfrr = speaker('watchfrr')
    const groups = groupLines([
      { speaker: zebra, text: 'a' },
      { speaker: zebra, text: 'b' },
      { speaker: watchfrr, text: 'c' },
      { speaker: zebra, text: 'd' },
    ])
    expect(groups.map((group) => [group.speaker.id, group.texts])).toEqual([
      ['zebra', ['a', 'b']],
      ['watchfrr', ['c']],
      ['zebra', ['d']],
    ])
  })

  it('returns nothing for an empty scene', () => {
    expect(groupLines([])).toEqual([])
  })
})
