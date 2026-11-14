import type { GuideBeat } from '@features/guide/types'
import {
  ASKING_WORD,
  CODE_SPAN,
  ENDS_THE_ASK,
  INTRODUCING_MARK,
  KEYWORD,
  LEADING_PROMPT,
  LOOKS_TYPED,
  PROMPT_LIKE,
  QUOTES,
  ROUTER_CLICK,
  SENTENCE_OF_ITS_OWN,
  SENTENCE_START,
} from './guide-command.constants'

const wordsOf = (line: string): string[] => line.replace(QUOTES, '').trim().split(/\s+/).filter(Boolean)

/** The text of a beat, one entry per line of the story, the question's included. */
export function beatLinesOf(beat: GuideBeat): readonly string[] {
  return beat.flatMap((part) =>
    part.kind === 'lines' ? part.lines.map((line) => line.text) : part.kind === 'predict' ? [part.line.text] : []
  )
}

const isAsked = (line: string, start: number, end: number): boolean => {
  const before = line.slice(0, start)
  const after = line.slice(end)
  if (ASKING_WORD.test(before)) {
    return true
  }
  if (INTRODUCING_MARK.test(before) && ENDS_THE_ASK.test(after)) {
    return true
  }
  return SENTENCE_START.test(before) && SENTENCE_OF_ITS_OWN.test(after)
}

/**
 * The command a line of the story asks the player to type: the last span in backticks that the
 * sentence asks for ("type `ip -br link`", "Ask who answered: `show daemons`.", "`conf t`."). A
 * span the line only names (`UP`, `a#`, "as `-N a` was") is passed over; null when none is asked.
 */
export function askedCommandOf(line: string): string | null {
  let asked: string | null = null
  for (const match of line.matchAll(CODE_SPAN)) {
    const span = (match[1] ?? '').trim()
    const start = match.index ?? 0
    if (LOOKS_TYPED.test(span) && !PROMPT_LIKE.test(span) && isAsked(line, start, start + match[0].length)) {
      asked = span
    }
  }
  return asked
}

/**
 * The command each beat asks for before its pause, or null where it asks for none the Guide can
 * name. vtysh keeps a line's words after `?` ("Type `description ?`"), so the beat after one that
 * asked for a word and then `?` waits for that whole line ("description link to router c").
 */
export function beatCommandsOf(beats: readonly GuideBeat[]): readonly (string | null)[] {
  let kept = ''
  return beats.map((beat) => {
    const asked = beatLinesOf(beat).reduce<string | null>((last, line) => askedCommandOf(line) ?? last, null)
    const command =
      asked !== null && kept !== '' && !asked.startsWith(kept) && !asked.endsWith('?') ? `${kept} ${asked}` : asked
    kept = asked !== null && asked.length > 2 && asked.endsWith(' ?') ? asked.slice(0, -2).trim() : ''
    return command
  })
}

// FRR takes a keyword cut short (`sh` for `show`), and a story may write the short form itself.
const sameWord = (typed: string, expected: string): boolean =>
  typed === expected ||
  (KEYWORD.test(typed) && KEYWORD.test(expected) && (expected.startsWith(typed) || typed.startsWith(expected)))

/**
 * Whether a finished command line releases the pause after a beat that asked for `expected`.
 * The words must be the same in number, each one the expected word or a keyword cut short;
 * quotes and a prompt in front are ignored, case is not. Refused lines count: a beat may ask for
 * a command in the wrong mode to show the refusal. A beat that asks for nothing is released by any
 * command, and so is every beat while the Machine does not say what was typed (`typed` undefined).
 * A line ending in `?` never runs, so only Continue releases its beat.
 */
export function releasesPause(expected: string | null, typed: string | undefined): boolean {
  if (expected?.endsWith('?')) {
    return false
  }
  if (expected === null || typed === undefined) {
    return true
  }
  const want = wordsOf(expected)
  const got = wordsOf(typed.trimStart().replace(LEADING_PROMPT, ''))
  return got.length === want.length && got.every((word, at) => sameWord(word, want[at] ?? ''))
}

/** Where a step leaves the terminal: the router it moved to, and the vtysh modes still open in it. */
export interface WayIn {
  /** Null when it is the router the mission starts in. */
  readonly router: string | null
  /** The commands that opened each mode still open, in order: `vtysh`, `configure terminal`, … */
  readonly commands: readonly string[]
}

const isShortFor = (word: string, keyword: string): boolean => word.length > 0 && keyword.startsWith(word)

/** The vtysh modes open after `command`, from those open before it; an empty list is the shell. */
function modesAfter(modes: readonly string[], command: string): readonly string[] {
  const [first = '', second = ''] = wordsOf(command)
  const count = wordsOf(command).length
  if (modes.length === 0) {
    return count === 1 && first === 'vtysh' ? [command] : modes
  }
  if (first === 'end') {
    return modes.slice(0, 1)
  }
  if (first === 'exit' || first === 'quit') {
    return modes.slice(0, -1)
  }
  if (modes.length === 1 && count === 2 && isShortFor(first, 'configure') && isShortFor(second, 'terminal')) {
    return [...modes, command]
  }
  if (modes.length >= 2 && count >= 2 && (isShortFor(first, 'interface') || first === 'router')) {
    return [...modes.slice(0, 2), command]
  }
  return modes
}

const clickedRouterOf = (lines: readonly string[], routers: readonly string[]): string | null =>
  lines
    .flatMap((line) => [...line.matchAll(ROUTER_CLICK)].map((match) => match[1] ?? ''))
    .filter((name) => routers.includes(name))
    .at(-1) ?? null

/**
 * Where the terminal is once a step's commands have run: a "Click c" moves it to c's shell, and
 * `vtysh`, `configure terminal`, `interface …`, `end` and `exit` open and close vtysh's modes.
 */
export function wayInOf(beats: readonly GuideBeat[], routers: readonly string[], firstRouter: string | null): WayIn {
  const commands = beatCommandsOf(beats)
  let router = firstRouter
  let modes: readonly string[] = []
  for (const [at, beat] of beats.entries()) {
    const clicked = clickedRouterOf(beatLinesOf(beat), routers)
    if (clicked !== null) {
      router = clicked
      modes = []
    }
    const command = commands[at]
    if (command) {
      modes = modesAfter(modes, command)
    }
  }
  return { router: router === firstRouter ? null : router, commands: modes }
}

/**
 * The line the Guide opens Build it with after See it was skipped: how to get where See it leaves
 * the terminal, which Build it's first beat takes for granted. Null when See it leaves it where the
 * mission starts, or Build it opens by moving it itself (a click, or `vtysh`).
 */
export function skippedLeadOf(
  see: readonly GuideBeat[],
  build: readonly GuideBeat[],
  routers: readonly string[],
  firstRouter: string | null
): string | null {
  const [opening] = build
  if (opening && clickedRouterOf(beatLinesOf(opening), routers) !== null) {
    return null
  }
  const way = wayInOf(see, routers, firstRouter)
  const opensVtysh = beatCommandsOf(build)[0] === 'vtysh'
  const steps = [
    ...(way.router === null ? [] : [`click ${way.router} in the topology`]),
    ...(opensVtysh ? [] : way.commands.map((command) => `type \`${command}\``)),
  ]
  return steps.length === 0 ? null : `You skipped See it. Build it starts where See it ends: ${steps.join(', then ')}.`
}
