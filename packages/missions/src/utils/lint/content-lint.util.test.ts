import type { MissionDefinition } from '@peerfall/game/types'
import { describe, expect, it } from 'vitest'
import type { VocabularyRule } from '#types/definitions/lint'
import { countAsides, countWords, lintMission, strayWords } from '#utils/lint/content-lint.util'
import { parseStory } from '#utils/story/story.util'

const words = (n: number) => Array.from({ length: n }, () => 'word').join(' ')

const CARD = { id: 'zebra', term: 'zebra', simple: 'The daemon that talks to the kernel.', sources: [] }

function missionWith(fields: Partial<MissionDefinition>): MissionDefinition {
  return { id: 'the-silent-router', teaches: [], codex: [CARD], ...fields } as MissionDefinition
}

function storyWith(sections: Readonly<Record<string, string>>) {
  return parseStory(
    `# Title\n\n**Question:** Why?\n\n${Object.entries(sections)
      .map(([heading, body]) => `## ${heading}\n\n${body}\n`)
      .join('\n')}`
  )
}

const KEEPS_BUDGETS = storyWith({
  Scene: `> **zebra:** ${words(70)}`,
  'See it': `> **zebra:** ${words(190)}\n\n\`\`\`\n${words(500)}\n\`\`\``,
  'Build it': words(140),
  'Watch it': words(100),
  Debrief: words(40),
  'Real world': words(300),
})

describe('countWords', () => {
  it('counts tokens with a letter or digit, inline code included, and skips dashes', () => {
    expect(countWords('Run `show ip route` now — 3 times.')).toBe(7)
  })
})

describe('countAsides', () => {
  it('counts parentheses in prose, not in inline code', () => {
    expect(countAsides('Run `ping -c 3 (x)` (the probe), then (again) `vtysh`.')).toBe(2)
  })
})

describe('lintMission', () => {
  it('measures each step without its code and finds nothing in a mission that keeps every budget', () => {
    const lint = lintMission(missionWith({ teaches: ['frr-daemon', 'vtysh'] }), KEEPS_BUDGETS)

    expect(lint.steps.map((step) => [step.section, step.words])).toEqual([
      ['scene', 70],
      ['see-it', 190],
      ['build-it', 140],
      ['watch-it', 100],
      ['debrief', 40],
    ])
    expect(lint.storyWords).toBe(540)
    expect(lint.problems).toEqual([])
  })

  it('names every budget a mission breaks', () => {
    const story = storyWith({
      Scene: `> **zebra:** ${words(90)} (an aside)`,
      'See it': 'The game restarts the VM. Your numbers will differ.',
      Debrief: words(10),
      'Real world': 'The emulator is v86, a simulation.',
    })
    const mission = missionWith({
      teaches: ['a', 'b', 'c', 'd'],
      codex: [{ ...CARD, simple: words(30), deep: words(81) }],
    })

    expect(lintMission(mission, story).problems).toEqual([
      'teaches 4 concepts (budget 3)',
      'story: 111 words (budget 500–650)',
      'scene: 92 words (budget 80)',
      '1 parenthetical asides (budget 0)',
      'see-it: "the game"',
      'see-it: "the VM"',
      'see-it: "your numbers will differ"',
      'real-world: "emulator"',
      'real-world: "simulation"',
      'codex zebra: simple 30 words (budget 25)',
      'codex zebra: deep 81 words (budget 80)',
    ])
  })
})

describe('strayWords', () => {
  const RULES: readonly VocabularyRule[] = [
    { word: 'peer', means: 'a routing protocol neighbor', pattern: /\bpeers?\b/gi, allowed: /\bBGP peers?\b/g },
    { word: 'wire', means: 'a link', pattern: /\bwires?\b/gi, only: ['two-ends-of-one-cable'] },
  ]

  it('flags a word outside its allowed ways, and leaves inline code alone', () => {
    expect(strayWords('the-silent-router', 'Two BGP peers. See `show bgp peer`.', RULES)).toEqual([])
    expect(strayWords('the-silent-router', 'The peer answered.', RULES)).toEqual([
      'peer (only a routing protocol neighbor)',
    ])
  })

  it('lets the missions named in `only` use a word freely', () => {
    expect(strayWords('two-ends-of-one-cable', 'Along the wire.', RULES)).toEqual([])
    expect(strayWords('the-silent-router', 'Along the wire.', RULES)).toEqual(['wire (only a link)'])
  })
})
