/** One run of game text: plain, a real term set in `code`, **strong** or _emphasis_. */
export type InlineToken =
  | { readonly kind: 'text'; readonly text: string }
  | { readonly kind: 'code'; readonly text: string }
  | { readonly kind: 'strong'; readonly text: string }
  | { readonly kind: 'em'; readonly text: string }

// `code` first, so marks inside code (like `a_b_c`) stay literal.
const INLINE = /`([^`]+)`|\*\*([^*]+)\*\*|(?<![\w])_([^_]+)_(?![\w])/g

/** Splits game text into plain runs, `code` (real terms), **strong** and _emphasis_. */
export function tokenizeInline(text: string): readonly InlineToken[] {
  const tokens: InlineToken[] = []
  let last = 0
  for (const match of text.matchAll(INLINE)) {
    const at = match.index
    if (at > last) {
      tokens.push({ kind: 'text', text: text.slice(last, at) })
    }
    const [, code, strong, em] = match
    if (code !== undefined) {
      tokens.push({ kind: 'code', text: code })
    } else if (strong !== undefined) {
      tokens.push({ kind: 'strong', text: strong })
    } else if (em !== undefined) {
      tokens.push({ kind: 'em', text: em })
    }
    last = at + match[0].length
  }
  if (last < text.length) {
    tokens.push({ kind: 'text', text: text.slice(last) })
  }
  return tokens
}
