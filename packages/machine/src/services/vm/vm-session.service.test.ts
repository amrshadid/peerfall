import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { saveVmState } from '#services/vm/vm-state.service'
import { fakeIndexedDb } from '#test/fake-indexed-db'
import { VM_CONTROL_DONE, VM_ROUTER_FILE, type VmShellUpdate } from '#types/definitions/vm'

type Listener = (byte: number) => void

/** The guest as far as the session sees it: which namespace the terminal's shell is in. */
const guest = { shellRouter: '', lines: [] as string[] }

// A stand-in for v86: root's channel answers every line, and a killed shell comes back in the
// router written to the router file. A saved state is the shell's router, so a restore puts it back.
class FakeV86 {
  readonly #listeners = new Map<string, Listener[]>()

  constructor() {
    setTimeout(() => this.#emit('emulator-ready', 0), 0)
  }

  add_listener(name: string, listener: Listener) {
    this.#listeners.set(name, [...(this.#listeners.get(name) ?? []), listener])
  }

  serial_send_bytes(_port: number, bytes: Uint8Array) {
    const line = new TextDecoder().decode(bytes).trim()
    guest.lines.push(line)
    const written = new RegExp(`^echo (\\S*) > ${VM_ROUTER_FILE}$`).exec(line)
    if (written) {
      guest.shellRouter = written[1] ?? ''
    }
    setTimeout(() => {
      if (line.startsWith('kill -9')) {
        this.#send('serial0-output-byte', `\r\n${guest.shellRouter || 'machine'}:~# `)
      }
      this.#send('serial2-output-byte', `${VM_CONTROL_DONE} 0\n`)
    }, 1)
  }

  serial0_send(_text: string) {}

  async save_state(): Promise<ArrayBuffer> {
    return new TextEncoder().encode(guest.shellRouter).buffer
  }

  async restore_state(state: ArrayBuffer) {
    guest.shellRouter = new TextDecoder().decode(state)
  }

  async destroy() {}

  #emit(name: string, byte: number) {
    for (const listener of this.#listeners.get(name) ?? []) {
      listener(byte)
    }
  }

  #send(name: string, text: string) {
    for (const char of text) {
      this.#emit(name, char.charCodeAt(0))
    }
  }
}

vi.mock('v86', () => ({ V86: FakeV86 }))

const { createVmSession } = await import('#services/vm/vm-session.service')

/** Lets the Machine's waits run out: v86 settling, the save delay, the shell's prompt. */
async function done<T>(work: Promise<T>): Promise<T> {
  await vi.advanceTimersByTimeAsync(5_000)
  return work
}

async function startedSession() {
  const shell: VmShellUpdate[] = []
  const session = createVmSession('v86.wasm')
  await done(
    session.start(
      { baseUrl: '/vm/' },
      () => {},
      () => {},
      () => {},
      (update) => shell.push(update)
    )
  )
  await vi.advanceTimersByTimeAsync(1_000)
  return { session, shell }
}

describe('the terminal’s router across a restore', () => {
  beforeEach(async () => {
    vi.stubGlobal('indexedDB', fakeIndexedDb())
    vi.stubGlobal('fetch', async () => ({ ok: true, json: async () => ({ version: 'image' }) }))
    // A saved boot, so the session restores it instead of booting Linux.
    await saveVmState('image', new ArrayBuffer(0))
    vi.useFakeTimers()
    guest.shellRouter = ''
    guest.lines = []
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('moves the shell back to the router picked since the save, and only ever reports that one', async () => {
    const { session, shell } = await startedSession()
    await done(session.selectRouter('a'))
    expect(await done(session.saveHealthy())).toBe(true)
    await done(session.selectRouter('b'))
    shell.length = 0

    expect(await done(session.restoreHealthy())).toBe(true)

    expect(guest.shellRouter).toBe('b')
    expect(shell.at(-1)?.router).toBe('b')
    // The saved Machine's shell was in a: the store never hears it, so the map never jumps there.
    expect(shell.map((update) => update.router)).not.toContain('a')
  })

  it('reports the router once when the shell was saved where it is now', async () => {
    const { session, shell } = await startedSession()
    await done(session.selectRouter('c'))
    await done(session.saveHealthy())
    shell.length = 0
    guest.lines = []

    await done(session.restoreHealthy())

    expect(shell.map((update) => update.router)).toEqual(['c'])
    expect(guest.lines.some((line) => line.startsWith('kill -9'))).toBe(false)
  })
})
