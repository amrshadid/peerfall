import type { Story, StoryBlock, StoryProblem, StoryStep } from '#types/definitions/story'

const TITLE = /^#\s+(.+?)\s*$/
const SECTION_HEADING = /^##\s+(.+?)\s*$/
const OTHER_HEADING = /^#{3,}\s/
const QUESTION = /^\*\*Question:\*\*\s*(.+)$/
const SPOKEN_LINE = /^\*\*(.+?):\*\*\s*(.*)$/
const CODE_FENCE = /^```/
const QUOTE_PREFIX = /^>\s?/
const PAUSE = /^-{3,}$/
const OPTION = /^-\s+(\[x\]\s+)?(.+)$/i

/** `Real world` → `real-world`, the slug that `story.md#real-world` points at. */
export function slugify(heading: string): string {
  return heading
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

/** The section a story ref like `story.md#scene` points at. */
export function sectionOf(ref: string): string {
  return ref.slice(ref.indexOf('#') + 1)
}

interface Parsed {
  readonly story: Story
  readonly problems: readonly StoryProblem[]
}

/** A list with no `[x]` is an ordinary list, not a question: its line and its items read as before. */
function plainList(block: StoryBlock): StoryBlock[] {
  if (block.kind !== 'predict' || block.options.some((option) => option.right)) {
    return [block]
  }
  return [
    { kind: 'line', speaker: block.speaker, text: block.text },
    { kind: 'line', speaker: null, text: block.options.map((option) => `- ${option.text}`).join(' ') },
  ]
}

function parse(markdown: string): Parsed {
  const problems: StoryProblem[] = []
  const sections = new Map<string, StoryBlock[]>()
  // The line each question starts on, to name it if it marks more than one answer.
  const askedAt = new Map<StoryBlock, number>()
  let title = ''
  let question: string | null = null
  let blocks: StoryBlock[] | null = null
  let code: string[] | null = null
  let codeAt = 0
  let paragraph: string[] = []

  const flushParagraph = () => {
    if (blocks && paragraph.length > 0) {
      blocks.push({ kind: 'line', speaker: null, text: paragraph.join(' ') })
    }
    paragraph = []
  }

  markdown.split(/\r?\n/).forEach((raw, index) => {
    const lineNumber = index + 1
    if (code) {
      if (CODE_FENCE.test(raw)) {
        blocks?.push({ kind: 'code', text: code.join('\n') })
        code = null
      } else {
        code.push(raw)
      }
      return
    }
    const heading = SECTION_HEADING.exec(raw)
    if (heading?.[1]) {
      flushParagraph()
      const slug = slugify(heading[1])
      if (sections.has(slug)) {
        problems.push({ line: lineNumber, message: `the section "${heading[1]}" appears twice` })
      }
      blocks = []
      sections.set(slug, blocks)
      return
    }
    if (OTHER_HEADING.test(raw)) {
      problems.push({ line: lineNumber, message: 'only "# Title" and "## Section" headings are read' })
    }
    if (!blocks) {
      const titled = TITLE.exec(raw)
      const asked = QUESTION.exec(raw.trim())
      if (titled?.[1] && title === '') {
        title = titled[1]
      } else if (asked?.[1] && question === null) {
        question = asked[1]
      } else if (raw.trim() !== '') {
        problems.push({ line: lineNumber, message: 'only the title and the question come before the first section' })
      }
      return
    }
    if (CODE_FENCE.test(raw)) {
      flushParagraph()
      code = []
      codeAt = lineNumber
      return
    }
    const line = raw.replace(QUOTE_PREFIX, '').trim()
    if (line === '') {
      flushParagraph()
      return
    }
    if (PAUSE.test(line)) {
      flushParagraph()
      blocks.push({ kind: 'pause' })
      return
    }
    const option = OPTION.exec(line)
    if (option?.[2] !== undefined) {
      flushParagraph()
      const asked = blocks.at(-1)
      const answer = { text: option[2], right: option[1] !== undefined }
      if (asked?.kind === 'predict') {
        const next: StoryBlock = { ...asked, options: [...asked.options, answer] }
        askedAt.set(next, askedAt.get(asked) ?? lineNumber)
        blocks[blocks.length - 1] = next
        return
      }
      if (asked?.kind === 'line') {
        const next: StoryBlock = { kind: 'predict', speaker: asked.speaker, text: asked.text, options: [answer] }
        askedAt.set(next, lineNumber)
        blocks[blocks.length - 1] = next
        return
      }
    }
    const spoken = SPOKEN_LINE.exec(line)
    if (spoken?.[1] !== undefined && spoken[2] !== undefined) {
      flushParagraph()
      blocks.push({ kind: 'line', speaker: spoken[1], text: spoken[2] })
      return
    }
    paragraph.push(line)
  })
  flushParagraph()
  if (code) {
    problems.push({ line: codeAt, message: 'this code block is never closed with ```' })
  }
  for (const [block, line] of askedAt) {
    if (block.kind === 'predict' && block.options.filter((option) => option.right).length > 1) {
      problems.push({ line, message: 'a question marks one answer with [x], not several' })
    }
  }
  if (title === '') {
    problems.push({ line: 1, message: 'expected the mission’s title as "# Title" on the first line' })
  }
  if (question === null) {
    problems.push({ line: 1, message: 'expected a "**Question:**" line under the title' })
  }
  const read = new Map([...sections].map(([slug, parsed]) => [slug, parsed.flatMap(plainList)]))
  return { story: { title, question, sections: read }, problems: problems.sort((a, b) => a.line - b.line) }
}

/**
 * Parses a mission's `story.md`. `# Title` and a `**Question:**` line come first; sections start
 * at `## Heading`. Inside one, `> **Name:** text` is a spoken line, a paragraph is narration, a
 * fenced block is code and `---` is a pause. A `- ` list right after a line makes that line a
 * question with those answers; `- [x]` is the one that really happens.
 */
export function parseStory(markdown: string): Story {
  return parse(markdown).story
}

/** What in a story.md would not show as written, each with its line. */
export function storyProblems(markdown: string): readonly StoryProblem[] {
  return parse(markdown).problems
}

/** A section's beats cut at each pause: the steps the Guide shows one at a time. */
export function storySteps(blocks: readonly StoryBlock[]): readonly StoryStep[] {
  const steps: StoryBlock[][] = [[]]
  for (const block of blocks) {
    if (block.kind === 'pause') {
      steps.push([])
    } else {
      steps.at(-1)?.push(block)
    }
  }
  return steps.filter((step) => step.length > 0)
}
