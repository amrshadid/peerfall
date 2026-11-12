import type { MarkdownBlock, TitledMarkdown } from '@features/guide/types'

const FENCE = /^\s*```/
const HEADING = /^(#{1,3})\s+(.+?)\s*#*$/
const BULLET = /^\s*[-*]\s+(.+)$/
const NUMBERED = /^\s*\d+[.)]\s+(.+)$/

type HeadingLevel = 1 | 2 | 3

interface OpenList {
  readonly ordered: boolean
  readonly items: string[]
}

/**
 * Mission text as blocks. Reads exactly what `incident.md` and `debrief.md` use: `#` headings,
 * paragraphs, one fenced code block, bullet and numbered lists. Anything else stays a paragraph,
 * so a mark this does not know is shown as written instead of being dropped.
 */
export function parseMarkdown(source: string): readonly MarkdownBlock[] {
  const blocks: MarkdownBlock[] = []
  let paragraph: string[] = []
  // Read through a function: the compiler can't see the closures below assign it.
  let list: OpenList | null = null
  const openList = (): OpenList | null => list
  let code: string[] | null = null

  const closeParagraph = () => {
    if (paragraph.length > 0) {
      blocks.push({ kind: 'paragraph', text: paragraph.join(' ') })
      paragraph = []
    }
  }
  const closeList = () => {
    if (list) {
      blocks.push({ kind: 'list', ordered: list.ordered, items: list.items })
      list = null
    }
  }
  const addItem = (ordered: boolean, text: string) => {
    closeParagraph()
    if (list && list.ordered !== ordered) {
      closeList()
    }
    list ??= { ordered, items: [] }
    list.items.push(text.trim())
  }

  for (const line of source.replace(/\r\n?/g, '\n').split('\n')) {
    if (code !== null) {
      if (FENCE.test(line)) {
        blocks.push({ kind: 'code', text: code.join('\n') })
        code = null
      } else {
        code.push(line)
      }
      continue
    }
    if (FENCE.test(line)) {
      closeParagraph()
      closeList()
      code = []
      continue
    }
    if (line.trim() === '') {
      closeParagraph()
      closeList()
      continue
    }
    const heading = HEADING.exec(line)
    if (heading) {
      closeParagraph()
      closeList()
      blocks.push({ kind: 'heading', level: (heading[1]?.length ?? 1) as HeadingLevel, text: heading[2] ?? '' })
      continue
    }
    const bullet = BULLET.exec(line)
    const numbered = bullet ? null : NUMBERED.exec(line)
    if (bullet || numbered) {
      addItem(numbered !== null, (bullet ?? numbered)?.[1] ?? '')
      continue
    }
    const open = openList()
    if (open) {
      // A wrapped line belongs to the item above it.
      open.items[open.items.length - 1] = `${open.items.at(-1) ?? ''} ${line.trim()}`
    } else {
      paragraph.push(line.trim())
    }
  }
  // A fence left open still shows what was written in it.
  if (code !== null) {
    blocks.push({ kind: 'code', text: code.join('\n') })
  }
  closeParagraph()
  closeList()
  return blocks
}

/** Takes a leading `#` heading off as the title: the screen prints it in its own place. */
export function titledMarkdown(source: string): TitledMarkdown {
  const blocks = parseMarkdown(source)
  const [first, ...rest] = blocks
  return first?.kind === 'heading' && first.level === 1 ? { title: first.text, blocks: rest } : { title: null, blocks }
}
