import { V86 } from 'v86'
import { CONTROL_LOST, createVmControl } from '#services/vm/vm-control.service'
import { loadVmState, saveVmState } from '#services/vm/vm-state.service'
import type { StampedMachineEvent } from '#types/definitions/event'
import { type NetworkDefinition, ROUTER_NAME } from '#types/definitions/network'
import {
  VM_CMDLINE,
  VM_CONTROL_READY,
  VM_CONTROL_TIMEOUT_MS,
  VM_DEFAULT_SLOT,
  VM_MEMORY_BYTES,
  VM_OUTPUT_FLUSH_MS,
  VM_PROMPT,
  VM_RESIZE_SETTLE_MS,
  VM_RESTORE_SETTLE_MS,
  VM_ROUTER_FILE,
  VM_SAVE_DELAY_MS,
  VM_SETUP_TIMEOUT_MS,
  VM_SHELL_PID_FILE,
  type VmEventUpdate,
  type VmManifest,
  type VmPhase,
  type VmSession,
  type VmStartOptions,
} from '#types/definitions/vm'
import { parseEventLine } from '#utils/events/event-parser.util'
import {
  networkProblems,
  networkSetupLines,
  networkWatchLines,
  probeProblems,
  probeStartLine,
  probeStopLine,
  stampedFaultLine,
} from '#utils/network/network-script.util'

const PROMPT_TAIL = 64
const CONTROL_UART = 2
const NEWLINE = 0x0a
const CONSOLE_TTY = '/dev/ttyS0'
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// v86 internals: no public API reaches them.
interface V86Cpu {
  current_tsc: Uint32Array
  store_current_tsc: () => void
  set_tsc: (low: number, high: number) => void
}

/**
 * v86's set_tsc() takes the new offset from a reading that already has the old offset in it, so
 * each restore would move the guest's clock forward by the time since the one before: dead timers
 * expire and BFD sessions drop on a network that was healthy when it was saved. Setting the
 * counter to its own value first leaves an offset of zero, and the restore then lands on the
 * saved moment.
 */
function zeroTscOffset(emulator: V86): void {
  const cpu = (emulator as unknown as { v86?: { cpu?: Partial<V86Cpu> } }).v86?.cpu
  if (typeof cpu?.store_current_tsc !== 'function' || typeof cpu.set_tsc !== 'function' || !cpu.current_tsc) {
    return
  }
  cpu.store_current_tsc()
  cpu.set_tsc(cpu.current_tsc[0] ?? 0, cpu.current_tsc[1] ?? 0)
}

/** One Linux VM in this worker. `wasmUrl` is the emulator a start without its own uses. */
export function createVmSession(wasmUrl?: string): VmSession {
  let emulator: V86 | null = null
  let flushTimer: ReturnType<typeof setInterval> | null = null
  let markReady: () => void = () => {}
  // Lines sent before the control channel is up wait for it.
  const ready = new Promise<void>((resolve) => {
    markReady = resolve
  })
  const control = createVmControl((bytes) => emulator?.serial_send_bytes(CONTROL_UART, bytes))
  /** The Machine as it first reached its prompt, with no network: every setup starts from it. */
  let clean: ArrayBuffer | null = null
  /** The Machine with a mission's network built and converged, the router its terminal was in, and how many events it had sent. */
  const saved = new Map<string, { state: ArrayBuffer; router: string | null; events: number }>()
  let network: NetworkDefinition | null = null
  /** Everything the event port has said since the network was built. */
  const events: StampedMachineEvent[] = []
  let sent = 0
  let eventLine: number[] = []
  let onEvents: (update: VmEventUpdate) => void = () => {}
  const eventText = new TextDecoder()
  const flushEvents = () => {
    if (events.length > sent) {
      onEvents({ from: sent, events: events.slice(sent) })
      sent = events.length
    }
  }
  /** The Machine is back at an earlier moment: what it said after that never happened. */
  const rewindEvents = (kept: number) => {
    events.length = Math.min(events.length, kept)
    eventLine = []
    sent = events.length
    onEvents({ from: sent, events: [] })
  }
  const pushEventByte = (byte: number) => {
    if (byte !== NEWLINE) {
      eventLine.push(byte)
      return
    }
    const parsed = parseEventLine(eventText.decode(new Uint8Array(eventLine)))
    eventLine = []
    if (parsed) {
      events.push({ ...parsed.event, seq: events.length, timeMs: parsed.timeMs })
    }
  }
  let pristine = false
  let router: string | null = null
  let status: (phase: VmPhase, detail?: string | null) => void = () => {}
  let nextPrompt: () => Promise<void> = async () => {}
  // Held while the Machine is saved, set up or restored: a save would keep the keys, a restore lose them.
  let heldInput: string[] = []
  let holds = 0
  const hold = () => {
    holds++
  }
  const release = () => {
    holds = Math.max(0, holds - 1)
    if (holds === 0 && heldInput.length > 0) {
      const keys = heldInput.join('')
      heldInput = []
      pristine = false
      emulator?.serial0_send(keys)
    }
  }
  // A restore under a setup would wipe it: everything that changes the Machine takes turns, after boot.
  let turn: Promise<unknown> = ready
  const exclusive = <T>(work: () => Promise<T>): Promise<T> => {
    const result = turn.then(work)
    turn = result.catch(() => undefined)
    return result
  }
  let size: { rows: number; cols: number } | null = null
  let sizeTimer: ReturnType<typeof setTimeout> | null = null
  const sizeTty = async () => {
    if (size) {
      await control.run(`stty -F ${CONSOLE_TTY} rows ${size.rows} cols ${size.cols}`)
    }
  }

  const restore = async (running: V86, state: ArrayBuffer) => {
    // The line in flight belongs to the Machine being replaced: it will never answer.
    control.drop()
    zeroTscOffset(running)
    // A copy: v86 keeps what it is given.
    await running.restore_state(state.slice(0))
    await wait(VM_RESTORE_SETTLE_MS)
  }

  /** The terminal's shell is replaced by one in `next`'s namespace; resolves at its prompt. */
  const moveShell = async (next: string | null) => {
    await control.run(`echo ${next ?? ''} > ${VM_ROUTER_FILE}`)
    // Before the new shell starts, so it reads the size as it starts instead of a SIGWINCH later.
    await sizeTty()
    const prompt = nextPrompt()
    await control.run(`kill -9 "$(cat ${VM_SHELL_PID_FILE})"`)
    await prompt
    // bash prints its prompt just before readline takes the terminal; keys sooner split the line.
    await wait(VM_RESTORE_SETTLE_MS)
    router = next
  }

  return {
    async start(options: VmStartOptions, onOutput, onStatus, onEventUpdate) {
      status = (phase, detail = null) => onStatus({ phase, detail })
      onEvents = onEventUpdate ?? (() => {})
      status('loading')
      try {
        // The one file that changes with each image; everything it points to has a versioned path.
        const response = await fetch(`${options.baseUrl}manifest.json`, { cache: 'no-cache' })
        if (!response.ok) {
          throw new Error(`No Linux image at ${options.baseUrl} (HTTP ${response.status}); run pnpm vm:image`)
        }
        const { version } = (await response.json()) as VmManifest
        const saved = options.fresh ? null : await loadVmState(version)
        clean = saved
        const base = `${options.baseUrl}${version}/`
        const wasm = options.wasmUrl ?? wasmUrl
        if (wasm === undefined) {
          throw new Error('No emulator wasm: pass wasmUrl to start() or createVmSession()')
        }
        emulator = new V86({
          wasm_path: wasm,
          bios: { url: `${base}bios/seabios.bin` },
          vga_bios: { url: `${base}bios/vgabios.bin` },
          ...(saved
            ? { initial_state: { buffer: saved } }
            : {
                bzimage: { url: `${base}vmlinuz` },
                initrd: { url: `${base}initramfs.cpio.gz` },
                cmdline: VM_CMDLINE,
              }),
          filesystem: { basefs: `${base}fs.json`, baseurl: `${base}flat/` },
          memory_size: VM_MEMORY_BYTES,
          // COM1 is the player's terminal; COM3 is root's control channel.
          uart1: true,
          uart2: true,
          autostart: true,
          disable_keyboard: true,
          disable_mouse: true,
          disable_speaker: true,
        })
        const running = emulator

        let pending: number[] = []
        let tail = ''
        let controlTail = ''
        let atPrompt = Boolean(saved)
        let controlUp = Boolean(saved)
        let booted = Boolean(saved)
        running.add_listener('emulator-ready', () => {
          if (!saved) {
            status('booting')
            return
          }
          status('restoring')
          // v86 applies the saved state just after emulator-ready: a key or a line sent sooner is lost.
          setTimeout(() => {
            pristine = true
            status('ready')
            markReady()
            void exclusive(sizeTty)
            // A restored shell is already at its prompt; a newline makes it print one.
            running.serial0_send('\n')
          }, VM_RESTORE_SETTLE_MS)
        })
        let onPrompt: (() => void) | null = null
        nextPrompt = () =>
          new Promise<void>((resolve) => {
            tail = ''
            onPrompt = resolve
            setTimeout(resolve, VM_CONTROL_TIMEOUT_MS)
          })
        // The first boot is done once the terminal is at its prompt and root's channel is listening.
        const onBooted = () => {
          if (booted || !atPrompt || !controlUp) {
            return
          }
          booted = true
          // Keys and setups wait for the save, so the clean boot holds none of them.
          hold()
          setTimeout(() => {
            void running
              .save_state()
              .then((state) => {
                clean = state
                return saveVmState(version, state)
              })
              .catch(() => false)
              .finally(() => {
                pristine = true
                status('ready')
                markReady()
                release()
              })
          }, VM_SAVE_DELAY_MS)
        }
        running.add_listener('serial0-output-byte', (byte: number) => {
          pending.push(byte)
          tail = (tail + String.fromCharCode(byte)).slice(-PROMPT_TAIL)
          if (!VM_PROMPT.test(tail)) {
            return
          }
          if (onPrompt) {
            onPrompt()
            onPrompt = null
          }
          atPrompt = true
          onBooted()
        })
        running.add_listener('serial2-output-byte', (byte: number) => {
          control.push(byte)
          if (controlUp) {
            return
          }
          controlTail = (controlTail + String.fromCharCode(byte)).slice(-VM_CONTROL_READY.length)
          if (controlTail === VM_CONTROL_READY) {
            controlUp = true
            onBooted()
          }
        })
        running.add_listener('serial1-output-byte', pushEventByte)
        flushTimer = setInterval(() => {
          if (pending.length > 0) {
            onOutput(new Uint8Array(pending))
            pending = []
          }
          flushEvents()
        }, VM_OUTPUT_FLUSH_MS)
      } catch (error) {
        status('failed', error instanceof Error ? error.message : String(error))
      }
    },

    input(text) {
      if (holds > 0) {
        heldInput.push(text)
        return
      }
      if (emulator) {
        pristine = false
        emulator.serial0_send(text)
      }
    },

    setupNetwork(wanted: NetworkDefinition) {
      const problems = networkProblems(wanted)
      if (problems.length > 0) {
        return Promise.resolve({ ok: false, errors: problems })
      }
      // From the request on: keys typed while it waits its turn would reach the shell it replaces.
      hold()
      return exclusive(async () => {
        const running = emulator
        if (!running) {
          release()
          return { ok: false as const, errors: ['The Machine is not running'] }
        }
        try {
          status('setting-up')
          saved.clear()
          network = null
          if (!pristine && clean) {
            await restore(running, clean)
            router = null
          }
          rewindEvents(0)
          pristine = false
          // The watchers start last, and read each log from its first line: nothing is missed.
          for (const line of [...networkSetupLines(wanted), ...networkWatchLines(wanted)]) {
            const reply = await control.capture(line, VM_SETUP_TIMEOUT_MS)
            if (reply.status !== 0) {
              const why = reply.status === CONTROL_LOST ? 'did not answer' : `exited with status ${reply.status}`
              status('failed', 'The network could not be built')
              return { ok: false as const, errors: [`${line}: ${why}`, reply.output.trim()].filter(Boolean) }
            }
          }
          network = wanted
          status('ready')
          return { ok: true as const, value: null }
        } finally {
          release()
        }
      })
    },

    setFault(link, dropping) {
      return exclusive(async () => {
        pristine = false
        return (await control.run(stampedFaultLine(link, dropping))) === 0
      })
    },

    startProbe(probe) {
      const problems = network ? probeProblems(probe, network) : ['No network is built']
      if (problems.length > 0) {
        return Promise.resolve({ ok: false, errors: problems })
      }
      return exclusive(async () => {
        pristine = false
        const status = await control.run(probeStartLine(probe))
        return status === 0
          ? { ok: true as const, value: null }
          : { ok: false as const, errors: [`The probe did not start (status ${status})`] }
      })
    },

    stopProbe(id) {
      return exclusive(async () => {
        await control.run(probeStopLine(id))
      })
    },

    control(line, timeoutMs = VM_CONTROL_TIMEOUT_MS) {
      return exclusive(async () => {
        pristine = false
        return control.capture(line, timeoutMs)
      })
    },

    saveHealthy(slot = VM_DEFAULT_SLOT) {
      hold()
      return exclusive(async () => {
        const running = emulator
        if (!running) {
          release()
          return false
        }
        try {
          // FRR's files reach the 9p root before the save; a read in flight would be lost from it.
          await control.run('sync')
          await wait(VM_SAVE_DELAY_MS)
          saved.set(slot, { state: await running.save_state(), router, events: events.length })
          return true
        } catch {
          return false
        } finally {
          release()
        }
      })
    },

    restoreHealthy(slot = VM_DEFAULT_SLOT) {
      hold()
      return exclusive(async () => {
        const running = emulator
        const kept = saved.get(slot)
        if (!running || !kept) {
          release()
          return false
        }
        try {
          status('restoring')
          const wanted = router
          await restore(running, kept.state)
          rewindEvents(kept.events)
          router = kept.router
          if (wanted !== router) {
            await moveShell(wanted)
          } else {
            await sizeTty()
            // The restored shell is at its prompt; a newline makes it print one.
            running.serial0_send('\n')
          }
          status('ready')
          return true
        } finally {
          release()
        }
      })
    },

    selectRouter(next) {
      if (next !== null && !ROUTER_NAME.test(next)) {
        return Promise.resolve()
      }
      hold()
      return exclusive(async () => {
        try {
          if (emulator && next !== router) {
            pristine = false
            await moveShell(next)
          }
        } finally {
          release()
        }
      })
    },

    resizeTerminal(rows, cols) {
      if (!(Number.isInteger(rows) && Number.isInteger(cols) && rows > 0 && cols > 0)) {
        return
      }
      size = { rows, cols }
      if (sizeTimer !== null) {
        clearTimeout(sizeTimer)
      }
      sizeTimer = setTimeout(() => {
        sizeTimer = null
        void exclusive(sizeTty)
      }, VM_RESIZE_SETTLE_MS)
    },

    async stop() {
      if (flushTimer !== null) {
        clearInterval(flushTimer)
        flushTimer = null
      }
      if (sizeTimer !== null) {
        clearTimeout(sizeTimer)
        sizeTimer = null
      }
      await emulator?.destroy()
      emulator = null
    },
  }
}
