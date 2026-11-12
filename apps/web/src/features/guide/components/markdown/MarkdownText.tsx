import type { MarkdownBlock } from '@features/guide/types'
import { InlineText } from '@shared/components/ui'
import './MarkdownText.css'

export interface MarkdownTextProps {
  blocks: readonly MarkdownBlock[]
  /** The heading element a `#` becomes, so the text fits the page's outline: 3 makes `#` an h3 and `##` an h4. */
  topLevel?: 2 | 3 | 4
}

const HEADINGS = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] as const

/** Mission text as the mission's file wrote it: headings, paragraphs, a code block and lists. */
export function MarkdownText({ blocks, topLevel = 2 }: MarkdownTextProps) {
  return (
    <div className="guide-md">
      {blocks.map((block, index) => {
        // Blocks of one text never reorder.
        const key = `${index}-${block.kind}`
        switch (block.kind) {
          case 'heading': {
            const Heading = HEADINGS[Math.min(HEADINGS.length, topLevel + block.level - 1) - 1] ?? 'h6'
            return (
              <Heading key={key} className="guide-md__heading">
                <InlineText text={block.text} />
              </Heading>
            )
          }
          case 'code':
            return (
              // Focusable: a block wider than its column scrolls sideways, and keys must reach it.
              // biome-ignore lint/a11y/noNoninteractiveTabindex: a scrolling region has to take focus to be scrolled by keyboard
              <pre key={key} className="guide-md__code" tabIndex={0}>
                <code>{block.text}</code>
              </pre>
            )
          case 'list': {
            const List = block.ordered ? 'ol' : 'ul'
            return (
              <List key={key} className={`guide-md__list guide-md__list--${block.ordered ? 'ordered' : 'bullets'}`}>
                {block.items.map((item) => (
                  <li key={item}>
                    <InlineText text={item} />
                  </li>
                ))}
              </List>
            )
          }
          default:
            return (
              <p key={key}>
                <InlineText text={block.text} />
              </p>
            )
        }
      })}
    </div>
  )
}
