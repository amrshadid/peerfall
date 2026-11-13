import { describe, expect, it } from 'vitest'
import { parseStory, sectionOf, slugify, storyProblems, storySteps } from '#utils/story/story.util'

const STORY = `# The Silent Router

**Question:** Why does router a answer nothing?

## Scene

> **zebra:** Nothing runs on a yet.
>
> **watchfrr:** Then start something.

## Real world

Run this on any FRR router:

\`\`\`
sudo vtysh
\`\`\`
`

describe('parseStory', () => {
  it('reads the title and the question', () => {
    const story = parseStory(STORY)
    expect(story.title).toBe('The Silent Router')
    expect(story.question).toBe('Why does router a answer nothing?')
  })

  it('reads spoken lines with their speaker', () => {
    expect(parseStory(STORY).sections.get('scene')).toEqual([
      { kind: 'line', speaker: 'zebra', text: 'Nothing runs on a yet.' },
      { kind: 'line', speaker: 'watchfrr', text: 'Then start something.' },
    ])
  })

  it('keeps narration and code blocks in order', () => {
    expect(parseStory(STORY).sections.get('real-world')).toEqual([
      { kind: 'line', speaker: null, text: 'Run this on any FRR router:' },
      { kind: 'code', text: 'sudo vtysh' },
    ])
  })

  it('reads --- as a pause, and leaves one inside a code block alone', () => {
    const paced = parseStory('## Build it\n\n> **zebra:** Type vtysh.\n\n---\n\n```\na\n---\nb\n```\n')
    expect(paced.sections.get('build-it')).toEqual([
      { kind: 'line', speaker: 'zebra', text: 'Type vtysh.' },
      { kind: 'pause' },
      { kind: 'code', text: 'a\n---\nb' },
    ])
  })

  it('reads a list after a line as a question with its answers, [x] the one that happens', () => {
    const asked = parseStory('## Watch it\n\n> **zebra:** Who forwards the packet?\n>\n> - zebra\n> - [x] the kernel\n')
    expect(asked.sections.get('watch-it')).toEqual([
      {
        kind: 'predict',
        speaker: 'zebra',
        text: 'Who forwards the packet?',
        options: [
          { text: 'zebra', right: false },
          { text: 'the kernel', right: true },
        ],
      },
    ])
  })

  it('leaves a list with no [x] as a list', () => {
    const errand = parseStory('## Build it\n\n> **zebra:** Two things:\n>\n> - start FRR\n> - open vtysh\n')
    expect(errand.sections.get('build-it')).toEqual([
      { kind: 'line', speaker: 'zebra', text: 'Two things:' },
      { kind: 'line', speaker: null, text: '- start FRR - open vtysh' },
    ])
  })

  it('keeps the sections in the order of the file', () => {
    expect([...parseStory(STORY).sections.keys()]).toEqual(['scene', 'real-world'])
  })
})

describe('storyProblems', () => {
  it('finds nothing in a story written as the format says', () => {
    expect(storyProblems(STORY)).toEqual([])
  })

  it('names each problem with its line', () => {
    const broken = [
      'Some notes',
      '',
      '## Scene',
      '### Aside',
      '> **zebra:** Which?',
      '> - [x] one',
      '> - [x] two',
      '## Scene',
      '```',
      'never closed',
    ].join('\n')
    expect(storyProblems(broken)).toEqual([
      { line: 1, message: 'only the title and the question come before the first section' },
      { line: 1, message: 'expected the mission’s title as "# Title" on the first line' },
      { line: 1, message: 'expected a "**Question:**" line under the title' },
      { line: 4, message: 'only "# Title" and "## Section" headings are read' },
      { line: 6, message: 'a question marks one answer with [x], not several' },
      { line: 8, message: 'the section "Scene" appears twice' },
      { line: 9, message: 'this code block is never closed with ```' },
    ])
  })
})

describe('storySteps', () => {
  it('cuts a section at each pause, keeping a question at the end of its step', () => {
    const blocks = parseStory(
      '## Build it\n\nOne.\n\n---\n\n> **zebra:** Before you run it: up or down?\n>\n> - [x] up\n> - down\n\n---\n\nTwo.\n'
    ).sections.get('build-it')
    expect(storySteps(blocks ?? []).map((step) => step.map((block) => block.kind))).toEqual([
      ['line'],
      ['predict'],
      ['line'],
    ])
  })
})

describe('slugify and sectionOf', () => {
  it('match the story refs used in mission.yaml', () => {
    expect(slugify('Real world')).toBe('real-world')
    expect(slugify('See it')).toBe('see-it')
    expect(sectionOf('story.md#real-world')).toBe('real-world')
  })
})
