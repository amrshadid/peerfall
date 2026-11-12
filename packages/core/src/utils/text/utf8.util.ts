/** Code points below each limit fit in 1, 2 or 3 bytes; the rest take 4. */
const ONE_BYTE_LIMIT = 0x80
const TWO_BYTE_LIMIT = 0x800
const THREE_BYTE_LIMIT = 0x10000

const SURROGATE_FIRST = 0xd800
const SURROGATE_LAST = 0xdfff
const REPLACEMENT_CHARACTER = 0xfffd

/** Lead-byte markers for 2-, 3- and 4-byte sequences, and the marker and payload mask of a continuation byte. */
const LEAD_TWO = 0xc0
const LEAD_THREE = 0xe0
const LEAD_FOUR = 0xf0
const CONTINUATION = 0x80
const SIX_BITS = 0x3f

const continuation = (cp: number, shift: number): number => CONTINUATION | ((cp >> shift) & SIX_BITS)

/** Same bytes as `TextEncoder`, for packages that build without DOM or Node types. */
export function utf8Encode(text: string): Uint8Array {
  const bytes: number[] = []
  for (const char of text) {
    const raw = char.codePointAt(0) ?? REPLACEMENT_CHARACTER
    // A lone surrogate is not a Unicode scalar value; TextEncoder writes U+FFFD for it.
    const cp = raw >= SURROGATE_FIRST && raw <= SURROGATE_LAST ? REPLACEMENT_CHARACTER : raw
    if (cp < ONE_BYTE_LIMIT) {
      bytes.push(cp)
    } else if (cp < TWO_BYTE_LIMIT) {
      bytes.push(LEAD_TWO | (cp >> 6), continuation(cp, 0))
    } else if (cp < THREE_BYTE_LIMIT) {
      bytes.push(LEAD_THREE | (cp >> 12), continuation(cp, 6), continuation(cp, 0))
    } else {
      bytes.push(LEAD_FOUR | (cp >> 18), continuation(cp, 12), continuation(cp, 6), continuation(cp, 0))
    }
  }
  return Uint8Array.from(bytes)
}
