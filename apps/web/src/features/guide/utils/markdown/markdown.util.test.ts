import { DEBRIEF_FIXTURE, INCIDENT_FIXTURE } from '@features/mission/utils/fixtures'
import { describe, expect, it } from 'vitest'
import { parseMarkdown, titledMarkdown } from './markdown.util'

describe('parseMarkdown', () => {
  it('reads headings, paragraphs and lists, leaving inline marks in the text', () => {
    const blocks = parseMarkdown(
      [
        '# Title',
        '',
        'One **bold** line',
        'wrapped with `code`.',
        '',
        '## Part',
        '- first',
        '- second',
        '  goes on',
      ].join('\n')
    )
    expect(blocks).toEqual([
      { kind: 'heading', level: 1, text: 'Title' },
      { kind: 'paragraph', text: 'One **bold** line wrapped with `code`.' },
      { kind: 'heading', level: 2, text: 'Part' },
      { kind: 'list', ordered: false, items: ['first', 'second goes on'] },
    ])
  })

  it('keeps a fenced block as written, indentation and marks included', () => {
    const blocks = parseMarkdown(
      ['Before:', '```', 'configure terminal', ' interface a-c', '# not a heading', '```'].join('\n')
    )
    expect(blocks).toEqual([
      { kind: 'paragraph', text: 'Before:' },
      { kind: 'code', text: 'configure terminal\n interface a-c\n# not a heading' },
    ])
  })

  it('tells a numbered list from a bulleted one', () => {
    expect(parseMarkdown('1. one\n2. two\n- other')).toEqual([
      { kind: 'list', ordered: true, items: ['one', 'two'] },
      { kind: 'list', ordered: false, items: ['other'] },
    ])
  })

  it('shows what an unclosed fence holds', () => {
    expect(parseMarkdown('```\nshow bfd peers')).toEqual([{ kind: 'code', text: 'show bfd peers' }])
  })

  it('reads Windows line endings', () => {
    expect(parseMarkdown('# A\r\n\r\ntext\r\n')).toEqual([
      { kind: 'heading', level: 1, text: 'A' },
      { kind: 'paragraph', text: 'text' },
    ])
  })
})

describe('titledMarkdown', () => {
  it('takes the first heading off as the title', () => {
    expect(titledMarkdown('# Incident: it stopped\n\nBody.')).toEqual({
      title: 'Incident: it stopped',
      blocks: [{ kind: 'paragraph', text: 'Body.' }],
    })
    expect(titledMarkdown('Body only.').title).toBeNull()
  })

  it('reads a mission’s texts: an incident of paragraphs, a debrief that ends in the commands to repeat', () => {
    const incident = titledMarkdown(INCIDENT_FIXTURE)
    const debrief = titledMarkdown(DEBRIEF_FIXTURE)
    expect(incident.title).toBe('Incident: traffic to c stopped for half a minute')
    expect(incident.blocks.every((block) => block.kind === 'paragraph')).toBe(true)
    expect(debrief.title).toBe('Debrief: the link that never went down')
    expect(debrief.blocks.filter((block) => block.kind === 'heading')).toHaveLength(3)
    const code = debrief.blocks.find((block) => block.kind === 'code')
    expect(code?.text).toContain(' interface a-c\n  ip ospf bfd')
  })
})
