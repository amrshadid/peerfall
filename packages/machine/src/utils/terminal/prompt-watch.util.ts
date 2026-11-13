/**
 * Tells when a command the player typed has finished: the terminal is back at a prompt, bash's or
 * vtysh's, after the player pressed Enter. Pure: the session feeds it the keys and the bytes.
 */
export interface PromptWatch {
  /** Enters not answered by a prompt yet: several when commands were typed ahead of a running one. */
  readonly pending: number
  /** The current line as it shows, without the terminal's escape sequences. */
  readonly line: string
  /** The current line was already counted as a prompt: growing it must not count it again. */
  readonly counted: boolean
  /** Where an escape sequence is: none, just after ESC, or inside `ESC [ …`. */
  readonly sequence: 'none' | 'esc' | 'csi'
}

export const EMPTY_PROMPT_WATCH: PromptWatch = { pending: 0, line: '', counted: false, sequence: 'none' }

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
/** A line longer than any prompt is not one; it need not be kept whole. */
const LONGEST_PROMPT = 160

const ESC = '\u001b'
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
  return enters === 0 ? watch : { ...watch, pending: watch.pending + enters }
}

/**
 * Output from the terminal, in any pieces. A prompt counts when a line that starts after an Enter
 * is exactly a prompt at some moment: what follows it on the same line (watchfrr's notices,
 * written to the console after vtysh's prompt; keys typed ahead, which readline shows again) does
 * not undo it. `finished` is how many commands this output finished.
 */
export function watchOutput(watch: PromptWatch, text: string): { watch: PromptWatch; finished: number } {
  let { pending, line, counted, sequence } = watch
  let finished = 0
  for (const char of text) {
    if (sequence === 'esc') {
      sequence = char === '[' ? 'csi' : 'none'
      continue
    }
    if (sequence === 'csi') {
      // A control sequence ends at its final byte, `@` to `~`: `ESC [ ? 2004 h`.
      if (char >= '@' && char <= '~') {
        sequence = 'none'
      }
      continue
    }
    if (char === ESC) {
      sequence = 'esc'
      continue
    }
    if (char === '\n' || char === '\r') {
      // readline redraws a line from its start with `\r`: the prompt is drawn again, not printed anew.
      if (char === '\n') {
        counted = false
      }
      line = ''
      continue
    }
    if (line.length >= LONGEST_PROMPT) {
      continue
    }
    line += char
    if (pending > 0 && !counted && isPrompt(line)) {
      pending--
      finished++
      counted = true
    }
  }
  return { watch: { pending, line, counted, sequence }, finished }
}
