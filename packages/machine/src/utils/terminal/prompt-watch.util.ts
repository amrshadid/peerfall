/**
 * Tells when a command the player typed has finished: the terminal is back at a prompt, bash's or
 * vtysh's, after the player pressed Enter. Pure: the session feeds it the keys and the bytes.
 */
export interface PromptWatch {
  /** Enters not answered by a prompt yet: several when commands were typed ahead of a running one. */
  readonly pending: number
  /**
   * Enters whose newline has not reached the screen yet. A prompt drawn before it is readline
   * redrawing the line the Enter ends (`\ra# \e[Kexit`), not the answer to it.
   */
  readonly unseen: number
  /** The current line as it shows, without the terminal's escape sequences, from its last `\r`. */
  readonly line: string
  /** The current line was already counted as a prompt: growing it must not count it again. */
  readonly counted: boolean
  /** Where an escape sequence is: none, just after ESC, or inside `ESC [ …`. */
  readonly sequence: 'none' | 'esc' | 'csi'
  /** The parameters of the `ESC [ …` sequence being read: `2004` in `ESC [ ? 2004 h`. */
  readonly params: string
  /**
   * The current line as the terminal shows it, readline's redraws applied: a `\r` moves back to
   * its start, and what is written next writes over it.
   */
  readonly screen: string
  /** Where the cursor is in `screen`. */
  readonly cursor: number
  /** The command line of the oldest pending command, as it showed when Enter reached the screen. */
  readonly typed: string | null
}

export const EMPTY_PROMPT_WATCH: PromptWatch = {
  pending: 0,
  unseen: 0,
  line: '',
  counted: false,
  sequence: 'none',
  params: '',
  screen: '',
  cursor: 0,
  typed: null,
}

/**
 * bash's prompt on the terminal, `a:~# ` or `peerfall:/etc/frr# ` (its PS1 is `<host>:\w# `):
 * the path starts at `~` or `/`.
 */
const BASH_PROMPT = /^[a-z][a-z0-9]*:[~/][^\n]*# $/
/**
 * vtysh's prompt: the router's FRR hostname (the player may change it), then the node in brackets
 * when not at the top, `a# `, `a(config)# `, `a(config-if)# `, `a(config-router)# `; `>` before enable.
 */
const VTYSH_PROMPT = /^[A-Za-z0-9][A-Za-z0-9._-]*(\([a-z0-9-]+\))?[#>] $/
/** A line that starts with one of the prompts: a command line, once Enter ends it. */
const PROMPTED_LINE = /^(?:[a-z][a-z0-9]*:[~/][^#\n]*# |[A-Za-z0-9][A-Za-z0-9._-]*(\([a-z0-9-]+\))?[#>] )/
/** A line longer than any prompt is not one; it need not be kept whole. */
const LONGEST_PROMPT = 160
/** A command line longer than this is kept cut. */
const LONGEST_LINE = 2048

const ESC = '\u001b'
const BACKSPACE = '\b'
const BRACKETED_PASTE = '?2004'
const isPrompt = (line: string): boolean => BASH_PROMPT.test(line) || VTYSH_PROMPT.test(line)

/**
 * Keys the player typed. Enter (`\r` from a terminal, `\n` from a script) starts a command, or
 * several when pasted at once; other keys, Tab and `?` included, start none.
 */
export function watchInput(watch: PromptWatch, text: string): PromptWatch {
  let enters = 0
  for (const key of text) {
    if (key === '\r' || key === '\n') {
      enters++
    }
  }
  // `\r\n` from a script is one Enter.
  enters -= text.split('\r\n').length - 1
  return enters === 0 ? watch : { ...watch, pending: watch.pending + enters, unseen: watch.unseen + enters }
}

/** What an `ESC [ <params> <final>` sequence does to the line on screen: readline's moves and erases. */
function applyCsi(screen: string, cursor: number, params: string, final: string): [string, number] {
  const count = Math.max(1, Number.parseInt(params, 10) || 1)
  switch (final) {
    case 'C':
      return [screen, cursor + count]
    case 'D':
      return [screen, Math.max(0, cursor - count)]
    case 'K':
      // 0 or nothing: from the cursor to the end; 1: up to the cursor; 2: the whole line.
      if (params === '' || params === '0') {
        return [screen.slice(0, cursor), cursor]
      }
      return params === '2' ? ['', cursor] : [' '.repeat(cursor) + screen.slice(cursor), cursor]
    case 'P':
      return [screen.slice(0, cursor) + screen.slice(cursor + count), cursor]
    case '@':
      return [screen.slice(0, cursor) + ' '.repeat(count) + screen.slice(cursor), cursor]
    default:
      return [screen, cursor]
  }
}

/** Writes a character at the cursor, over what is there. */
function writeAt(screen: string, cursor: number, char: string): string {
  if (cursor >= LONGEST_LINE) {
    return screen
  }
  const padded = screen.length < cursor ? screen.padEnd(cursor) : screen
  return padded.slice(0, cursor) + char + padded.slice(cursor + 1)
}

/**
 * Output from the terminal, in any pieces. A prompt counts when a line that starts after an Enter
 * is exactly a prompt at some moment: what follows it on the same line (watchfrr's notices,
 * written to the console after vtysh's prompt; keys typed ahead, which readline shows again) does
 * not undo it. `finished` is how many commands this output finished, and `lines` their command
 * lines, oldest first: each line as it showed when Enter reached the screen, prompt included
 * (`a(config-if)# description to c`), or `''` when none showed.
 */
export function watchOutput(
  watch: PromptWatch,
  text: string
): { watch: PromptWatch; finished: number; lines: string[] } {
  let { pending, unseen, line, counted, sequence, params, screen, cursor, typed } = watch
  let finished = 0
  const lines: string[] = []
  for (const char of text) {
    if (sequence === 'esc') {
      sequence = char === '[' ? 'csi' : 'none'
      params = ''
      continue
    }
    if (sequence === 'csi') {
      // A control sequence ends at its final byte, `@` to `~`: `ESC [ ? 2004 h`.
      if (char >= '@' && char <= '~') {
        sequence = 'none'
        ;[screen, cursor] = applyCsi(screen, cursor, params, char)
        // bash turns bracketed paste on just before it draws its prompt: the prompt starts there,
        // even on a line that output left unfinished (`printf 'x:y# '`).
        if (char === 'h' && params === BRACKETED_PASTE) {
          line = ''
          screen = ''
          cursor = 0
        }
      } else {
        params += char
      }
      continue
    }
    if (char === ESC) {
      sequence = 'esc'
      continue
    }
    if (char === BACKSPACE) {
      cursor = Math.max(0, cursor - 1)
      continue
    }
    if (char === '\n' || char === '\r') {
      // readline redraws a line from its start with `\r`: the prompt is drawn again, not printed anew.
      if (char === '\n') {
        counted = false
        // A line ending while a command waits for its prompt: its command line if it starts with one.
        // A later one replaces it (a `?` answered after Enter was pressed), until the prompt comes.
        const shown = screen.trimEnd()
        if (pending > 0 && PROMPTED_LINE.test(shown)) {
          typed = shown
        }
        screen = ''
        unseen = Math.max(0, unseen - 1)
      }
      cursor = 0
      line = ''
      continue
    }
    screen = writeAt(screen, cursor, char)
    cursor++
    if (line.length >= LONGEST_PROMPT) {
      continue
    }
    line += char
    if (pending > unseen && !counted && isPrompt(line)) {
      pending--
      finished++
      lines.push(typed ?? '')
      typed = null
      counted = true
    }
  }
  return { watch: { pending, unseen, line, counted, sequence, params, screen, cursor, typed }, finished, lines }
}
