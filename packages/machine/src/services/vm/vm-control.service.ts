import { VM_CONTROL_DONE, VM_CONTROL_TIMEOUT_MS } from '#types/definitions/vm'

const DONE = new RegExp(`${VM_CONTROL_DONE} (-?\\d+)\\r?\\n`)
/** The status of a line that never answered: lost to a restore, or a guest that stopped listening. */
export const CONTROL_LOST = -1

/** A control line's exit status and everything it printed (stdout and stderr) before it. */
export interface ControlReply {
  readonly status: number
  readonly output: string
}

/**
 * The root channel on COM3: one command line at a time, each answered `__PF_DONE__ <status>`. Lines
 * are queued, so a mission's setup, a fault and a probe never interleave, and none waits forever.
 */
export function createVmControl(send: (bytes: Uint8Array) => void, timeoutMs = VM_CONTROL_TIMEOUT_MS) {
  const encoder = new TextEncoder()
  const decoder = new TextDecoder()
  let reply: number[] = []
  let tail = ''
  let waiting: ((reply: ControlReply) => void) | null = null
  let timer: ReturnType<typeof setTimeout> | null = null
  let queue: Promise<unknown> = Promise.resolve()

  const settle = (status: number, output: string) => {
    const resolve = waiting
    waiting = null
    reply = []
    tail = ''
    if (timer !== null) {
      clearTimeout(timer)
      timer = null
    }
    resolve?.({ status, output })
  }

  const ask = (line: string, ms: number): Promise<ControlReply> => {
    const result = queue.then(
      () =>
        new Promise<ControlReply>((resolve) => {
          reply = []
          tail = ''
          waiting = resolve
          timer = setTimeout(() => settle(CONTROL_LOST, decoder.decode(new Uint8Array(reply))), ms)
          send(encoder.encode(`${line}\n`))
        })
    )
    queue = result.catch(() => undefined)
    return result
  }

  return {
    /** A byte the guest wrote on COM3. */
    push(byte: number) {
      if (!waiting) {
        return
      }
      reply.push(byte)
      // Only the end can hold the reply line; a log can be tens of kilobytes.
      tail = (tail + String.fromCharCode(byte)).slice(-(VM_CONTROL_DONE.length + 16))
      const done = DONE.exec(tail)
      if (done) {
        const text = decoder.decode(new Uint8Array(reply))
        settle(Number(done[1]), text.slice(0, text.lastIndexOf(VM_CONTROL_DONE)))
      }
    },
    /** Runs `line` as root in the guest; resolves with its exit status, or CONTROL_LOST. */
    async run(line: string): Promise<number> {
      return (await ask(line, timeoutMs)).status
    },
    /** Runs `line` as root and returns what it printed too; a long report may take `ms`. */
    capture(line: string, ms = timeoutMs): Promise<ControlReply> {
      return ask(line, ms)
    },
    /** A restore puts the guest back to before the line in flight: it will never answer. */
    drop() {
      settle(CONTROL_LOST, '')
    },
  }
}
