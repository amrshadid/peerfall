/**
 * One block of mission text. Only what the mission files use: headings, paragraphs, a fenced
 * code block and lists. Inline marks (`code`, **strong**) stay in the text for `InlineText`.
 */
export type MarkdownBlock =
  | { readonly kind: 'heading'; readonly level: 1 | 2 | 3; readonly text: string }
  | { readonly kind: 'paragraph'; readonly text: string }
  /** A fenced block, with its lines and their indentation as written. */
  | { readonly kind: 'code'; readonly text: string }
  | { readonly kind: 'list'; readonly ordered: boolean; readonly items: readonly string[] }

/** A mission text with its first heading taken off as the title. */
export interface TitledMarkdown {
  /** The text of the leading `#` heading; null when the text does not start with one. */
  readonly title: string | null
  readonly blocks: readonly MarkdownBlock[]
}
