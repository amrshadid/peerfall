import type { FrrToken, FrrTokenKind } from '@features/editor/types'

// reads lib/command.c: cmd_make_strvec(): a line whose first character after the blanks is `!` or `#` is a comment.
const COMMENT = /^[!#]/
// An IPv4 address with or without its prefix length, or a plain number (an area, a cost, a timer).
const NUMBER = /^(?:\d{1,3}(?:\.\d{1,3}){3}(?:\/\d{1,2})?|\d+)(?=\s|$)/
const WORD = /^[A-Za-z][\w-]*/
const BLANKS = /^\s+/

/**
 * Splits one line of an FRR configuration for highlighting: a comment line, the word that names the
 * command (after `no`, which is marked too), and numbers and addresses. Everything else is plain.
 */
export function tokenizeFrrLine(line: string): readonly FrrToken[] {
  const tokens: FrrToken[] = []
  let at = 0
  // True until the command's own word has been read.
  let naming = true
  const push = (length: number, kind: FrrTokenKind) => {
    tokens.push({ from: at, to: at + length, kind })
    at += length
  }
  while (at < line.length) {
    const rest = line.slice(at)
    const blanks = BLANKS.exec(rest)
    if (blanks) {
      push(blanks[0].length, null)
      continue
    }
    if (naming && COMMENT.test(rest)) {
      push(rest.length, 'comment')
      break
    }
    const word = WORD.exec(rest)
    if (word) {
      push(word[0].length, naming ? 'keyword' : null)
      // `no ip ospf bfd`: the command is still to come.
      naming = naming && word[0] === 'no'
      continue
    }
    naming = false
    const number = NUMBER.exec(rest)
    if (number) {
      push(number[0].length, 'number')
      continue
    }
    // Anything else runs to the next blank as one plain piece, so `a-c` or `::1` is never cut in two.
    push(/^\S+/.exec(rest)?.[0].length ?? 1, null)
  }
  return tokens
}
