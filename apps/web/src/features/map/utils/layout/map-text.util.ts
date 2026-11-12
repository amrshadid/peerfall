/** The width a line of `text` takes at `glyph` px per character. */
export function textWidth(text: string, glyph: number): number {
  return Math.ceil(text.length * glyph)
}

/** How many characters fit in `width` px at `glyph` px per character (at least one). */
export function charsIn(width: number, glyph: number): number {
  return Math.max(1, Math.floor(width / glyph))
}

/** Breaks at spaces; an over-long word gets its own line, and a cut last line ends in an ellipsis. */
export function wrapWords(text: string, maxChars: number, maxLines = Number.POSITIVE_INFINITY): readonly string[] {
  const lines: string[] = []
  let line = ''
  for (const word of text.split(/\s+/).filter((part) => part !== '')) {
    const candidate = line === '' ? word : `${line} ${word}`
    if (candidate.length <= maxChars || line === '') {
      line = candidate
    } else {
      lines.push(line)
      line = word
    }
  }
  if (line !== '') {
    lines.push(line)
  }
  if (lines.length <= maxLines) {
    return lines
  }
  const kept = lines.slice(0, maxLines)
  const last = kept[kept.length - 1] ?? ''
  kept[kept.length - 1] = `${last.slice(0, Math.max(0, maxChars - 1)).trimEnd()}…`
  return kept
}

/** Up to three lines; two lines break at the space nearest the middle, so they balance. */
export function stopLines(title: string, maxChars: number): readonly string[] {
  if (title.length <= maxChars || !title.includes(' ')) {
    return [title]
  }
  const middle = title.length / 2
  let best = -1
  for (let at = title.indexOf(' '); at !== -1; at = title.indexOf(' ', at + 1)) {
    if (best === -1 || Math.abs(at - middle) < Math.abs(best - middle)) {
      best = at
    }
  }
  const halves = [title.slice(0, best), title.slice(best + 1)]
  if (halves.every((half) => half.length <= maxChars)) {
    return halves
  }
  return wrapWords(title, maxChars, 3)
}
