import { describe, expect, it } from 'vitest'
import { EMPTY_PROMPT_WATCH, type PromptWatch, watchInput, watchOutput } from '#utils/terminal/prompt-watch.util'

// Every chunk here is copied from the Machine's terminal (FRR 10.6.1, bash 5 with bracketed
// paste), split as the session flushed it, in router a.
const AT_PROMPT = watchOutput(EMPTY_PROMPT_WATCH, '\u001b[?2004ha:~# ').watch

/** The keys, then the output in its chunks; how many commands each chunk finished. */
function play(start: PromptWatch, keys: string, chunks: readonly string[]): { watch: PromptWatch; finished: number[] } {
  let watch = watchInput(start, keys)
  const finished: number[] = []
  for (const chunk of chunks) {
    const result = watchOutput(watch, chunk)
    watch = result.watch
    finished.push(result.finished)
  }
  return { watch, finished }
}

describe('a command finished at the terminal', () => {
  it('counts bash coming back to its prompt after Enter', () => {
    const { finished, watch } = play(AT_PROMPT, 'echo hi\r', ['echo hi\r\n\u001b[?2004l\rhi\r\n\u001b[?2004ha:~# '])
    expect(finished).toEqual([1])
    expect(watch.pending).toBe(0)
  })

  it('counts a prompt split across two chunks once', () => {
    expect(play(AT_PROMPT, '\r', ['\r\n\u001b[?2004l\r\u001b[?2004ha', ':~# ']).finished).toEqual([0, 1])
  })

  it('counts entering vtysh, and every command inside it, at each of its prompts', () => {
    let watch = AT_PROMPT
    const steps: [string, string[]][] = [
      [
        'vtysh\r',
        [
          'vtysh\r\n',
          '\u001b[?2004l\r',
          '\r\n',
          'Hello, this is FRRouting (version 10.6.1).\r\nCopyright 1996-2005 Kunihiro Ishiguro, et al.\r\n\r\na# ',
        ],
      ],
      ['show daemons\r', ['show daemons\r\n mgmtd zebra staticd watchfrr\r\na# ']],
      ['configure terminal\r', ['configure terminal\r\n', 'a(config)# ']],
      ['interface lo\r', ['interface lo\r\n', 'a(config-if)# ']],
      ['description test\r', ['description test\r\n', 'a(config-if)# ']],
      ['end\r', ['end\r\n', 'a# ']],
      ['exit\r', ['exit\r\n', '\u001b[?2004ha:~# ']],
    ]
    for (const [keys, chunks] of steps) {
      const played = play(watch, keys, chunks)
      expect([keys, played.finished.reduce((sum, count) => sum + count, 0)]).toEqual([keys, 1])
      watch = played.watch
    }
  })

  it('counts write memory although watchfrr’s notice is written after the prompt, on the same line', () => {
    const { finished, watch } = play(AT_PROMPT, 'write memory\r', [
      'write memory\r\nNote: this version of vtysh never writes vtysh.conf\r\n',
      'Building Configuration...\r\n',
      'Integrated configuration saved to /etc/frr/a/frr.conf\r\n[OK]\r\n',
      'watchfrr[523]: [WFP93-1D146] configuration write completed with exit code 0\r\na# ',
    ])
    expect(finished).toEqual([0, 0, 0, 1])
    expect(watch.pending).toBe(0)
  })

  it('counts the restart, whose watchfrr lines come before the prompt', () => {
    const { finished } = play(AT_PROMPT, '/usr/lib/frr/frrinit.sh restart a\r', [
      '/usr/lib/frr/frrinit.sh restart a\r\n\u001b[?2004l\r',
      'watchfrr[523]: [NG1AJ-FP2TQ] Terminating on signal\r\n',
      'Stopped watchfrr\r\n',
      "Starting watchfrr with command: '  /usr/lib/frr/watchfrr -N a -d   mgmtd zebra staticd'\r\n",
      'watchfrr[666]: [KWE5Q-QNGFC] all daemons up, doing startup-complete notify\r\n',
      'Started watchfrr\r\n\u001b[?2004ha:~# ',
    ])
    expect(finished).toEqual([0, 0, 0, 0, 0, 1])
  })

  it('counts both commands when the second was typed while the first ran', () => {
    let watch = watchInput(AT_PROMPT, 'sleep 2\r')
    watch = watchOutput(watch, 'sleep 2\r\n\u001b[?2004l\r').watch
    watch = watchInput(watch, 'echo ahead\r')
    // The tty echoes the keys at once; readline shows them again after the first prompt.
    const echoed = watchOutput(watch, 'echo ahead\r\n')
    expect(echoed.finished).toBe(0)
    const done = watchOutput(echoed.watch, '\u001b[?2004ha:~# echo ahead\r\n\u001b[?2004l\rahead\r\n\u001b[?2004ha:~# ')
    expect(done.finished).toBe(2)
    expect(done.watch.pending).toBe(0)
  })

  it('counts a command stopped with Ctrl-C', () => {
    let watch = play(AT_PROMPT, 'sleep 30\r', ['sle', 'ep 30\r\n\u001b[?2004l\r']).watch
    watch = watchInput(watch, '\u0003')
    expect(play(watch, '', ['^C', '\r\n\u001b[?2004ha:~# ']).finished).toEqual([0, 1])
  })

  it('counts nothing for keys without Enter: Tab and ? in vtysh redraw the prompt', () => {
    const atVtysh = watchOutput(EMPTY_PROMPT_WATCH, 'a# ').watch
    const { finished, watch } = play(atVtysh, 'show ver?', [
      'show ver\r\n  version  Displays zebra version\r\na# show ver',
    ])
    expect(finished).toEqual([0])
    expect(play(watch, '\u0015sh\t', ['\ra# \u001b[K', 'show ']).finished).toEqual([0, 0])
  })

  it('counts output that ends like a prompt once, with the real prompt that follows on the line', () => {
    const { finished, watch } = play(AT_PROMPT, "printf 'x:y# '\r", [
      "printf 'x:y# '\r\n\u001b[?2004l\rx:y# \u001b[?2004ha:~# ",
    ])
    expect(finished).toEqual([1])
    expect(watch.pending).toBe(0)
  })

  it('counts nothing when no Enter was pressed: the Machine’s own newline after a restore', () => {
    expect(watchOutput(AT_PROMPT, '\r\n\u001b[?2004ha:~# ').finished).toBe(0)
  })

  it('waits for the Enter to reach the screen: readline redrawing the line first is not the prompt', () => {
    const atVtysh = watchOutput(EMPTY_PROMPT_WATCH, '\r\nro         route      router-id  \r\na# sh ip ro').watch
    // Ctrl-U, then exit and Enter: readline draws the prompt again before the newline.
    const { finished } = play(atVtysh, '\u0015exit\r', ['\ra# \u001b[Kexit\r\n', '\u001b[?2004ha:~# '])
    expect(finished).toEqual([0, 1])
  })

  it('counts a pasted block of lines as one command per line', () => {
    expect(watchInput(AT_PROMPT, 'echo one\recho two\r').pending).toBe(2)
    expect(watchInput(AT_PROMPT, 'echo one\r\n').pending).toBe(1)
  })
})

/** Plays each step's keys and chunks in turn; the command lines each step finished. */
function linesOf(start: PromptWatch, steps: readonly (readonly [string, readonly string[]])[]): string[][] {
  let watch = start
  return steps.map(([keys, chunks]) => {
    watch = watchInput(watch, keys)
    const lines: string[] = []
    for (const chunk of chunks) {
      const result = watchOutput(watch, chunk)
      watch = result.watch
      lines.push(...result.lines)
    }
    return lines
  })
}

describe('the command line a finished command was typed as', () => {
  it('is the line as it showed at Enter, prompt included, in bash and in vtysh', () => {
    expect(
      linesOf(AT_PROMPT, [
        [
          'vtysh\r',
          [
            'vtysh\r\n\u001b[?2004l\r',
            '\r\nHello, this is FRRouting (version 10.6.1).\r\nCopyright 1996-2005 Kunihiro Ishiguro, et al.\r\n\r\na# ',
          ],
        ],
        ['end\r', ['end\r\n', 'a# ']],
      ])
    ).toEqual([['a:~# vtysh'], ['a# end']])
  })

  it('holds what Tab completed', () => {
    const atVtysh = watchOutput(EMPTY_PROMPT_WATCH, 'a# ').watch
    expect(
      linesOf(atVtysh, [
        ['conf\t', ['conf', 'igure ']],
        ['\r', ['\r\na(config)# ']],
        ['int\t a-c\r', ['interface  a-c\r\n', 'a(config-if)# ']],
      ])
    ).toEqual([[], ['a# configure'], ['a(config)# interface  a-c']])
  })

  it('is the line typed after a ? help, not the line the help interrupted', () => {
    const atInterface = watchOutput(EMPTY_PROMPT_WATCH, 'a(config-if)# ').watch
    expect(
      linesOf(atInterface, [
        [
          'description ?',
          ['description \r\n', '  LINE  Characters describing this interface\r\na(config-if)# description '],
        ],
        ['link to router c\r', ['link to router c\r\n', 'a(config-if)# ']],
      ])
    ).toEqual([[], ['a(config-if)# description link to router c']])
  })

  it('has the backspaces applied', () => {
    const atInterface = watchOutput(EMPTY_PROMPT_WATCH, 'a(config-if)# ').watch
    expect(
      linesOf(atInterface, [
        ['descx\b\bription x\r', ['descx\b \b\b \b', 'ription x\r\n% Unknown command: desription x\r\na(config-if)# ']],
      ])
    ).toEqual([['a(config-if)# desription x']])
  })

  it('is the line readline drew again after Ctrl-U', () => {
    const atVtysh = watchOutput(EMPTY_PROMPT_WATCH, '\r\nro         route      router-id  \r\na# sh ip ro').watch
    expect(linesOf(atVtysh, [['\u0015exit\r', ['\ra# \u001b[Kexit\r\n', '\u001b[?2004ha:~# ']]])).toEqual([['a# exit']])
  })

  it('keeps each of two commands, the second typed while the first ran', () => {
    let watch = watchInput(AT_PROMPT, 'sleep 2\r')
    watch = watchOutput(watch, 'sleep 2\r\n\u001b[?2004l\r').watch
    watch = watchInput(watch, 'echo ahead\r')
    watch = watchOutput(watch, 'echo ahead\r\n').watch
    const done = watchOutput(watch, '\u001b[?2004ha:~# echo ahead\r\n\u001b[?2004l\rahead\r\n\u001b[?2004ha:~# ')
    expect(done.lines).toEqual(['a:~# sleep 2', 'a:~# echo ahead'])
  })
})
