import type { Validated } from '@peerfall/core/types'
import type { ProbeDefinition, StampedMachineEvent } from '#types/definitions/event'
import type { LinkDefinition, NetworkDefinition } from '#types/definitions/network'

/** What the VM emulates: enough for nine FRR daemons (about 45 MB) with room for more routers. */
export const VM_MEMORY_BYTES = 256 * 1024 * 1024

/** `quiet` keeps the kernel's boot log off the player's terminal. */
export const VM_CMDLINE = 'console=ttyS0 rw tsc=reliable mitigations=off random.trust_cpu=on quiet'

export const VM_HOSTNAME = 'peerfall'

/** Root's control channel prints this once it is listening. */
export const VM_CONTROL_READY = '__PF_READY__'

/** Root's control channel prints this and the exit status after each line it ran. */
export const VM_CONTROL_DONE = '__PF_DONE__'

/** Starting nine FRR daemons takes about 18 s in the emulator; a line slower than this is stuck. */
export const VM_CONTROL_TIMEOUT_MS = 60_000

/** One router's daemons and its configuration load. */
export const VM_SETUP_TIMEOUT_MS = 120_000

/** FRR's unprivileged user and its groups, as the `frr` package's install script creates them. */
export const VM_FRR_USER = { name: 'frr', uid: 100, gid: 101, vtyGroup: 'frrvty', vtyGid: 102 } as const

/** COM2: the Machine's news, one line each, for the event stream. */
export const VM_EVENT_TTY = '/dev/ttyS1'

/** The router whose namespace the terminal's next shell starts in; empty or missing for none. */
export const VM_ROUTER_FILE = '/run/pf-router'
/** The terminal's shell: killing it makes init start the next one. */
export const VM_SHELL_PID_FILE = '/run/pf-shell.pid'
export const VM_SHELL = '/usr/libexec/pf-shell'
export const VM_BASHRC = '/etc/pf-bashrc'

/** bash's prompt on the terminal: `peerfall:~# `, or `a:~# ` in router a. */
export const VM_PROMPT = /[a-z][a-z0-9]*:[^\n]*# $/

export const VM_OUTPUT_FLUSH_MS = 16
/** A 9p read still in flight is lost from a saved state: it is saved after this much quiet. */
export const VM_SAVE_DELAY_MS = 1_000
/** v86 applies a state just after it is asked to: a key or a line sent sooner is lost. */
export const VM_RESTORE_SETTLE_MS = 300
export const VM_RESIZE_SETTLE_MS = 150

/** Content-addressed image files, so a cached one never goes stale. */
export const VM_FILE_CACHE = 'peerfall-vm-files-v1'
export const VM_STATE_DB = 'peerfall-vm'
export const VM_STATE_STORE = 'boots'

/** What `manifest.json` says about the built image. */
export interface VmManifest {
  /** Changes whenever the image or its command line does, so a cached image never goes stale. */
  readonly version: string
  readonly kernelRelease: string
  readonly frrVersion: string
}

export type VmPhase = 'off' | 'loading' | 'booting' | 'restoring' | 'setting-up' | 'ready' | 'failed'

export interface VmStatus {
  readonly phase: VmPhase
  /** Why it failed. */
  readonly detail: string | null
}

export interface VmStartOptions {
  /** Where the image is served from, ending in `/`. */
  readonly baseUrl: string
  /** The emulator's wasm; the worker passes its own. */
  readonly wasmUrl?: string
  /** Boot from the kernel even if a boot is saved for this image (tests, the recorder). */
  readonly fresh?: boolean
}

/** A control line's exit status and everything it printed (stdout and stderr) before it. */
export interface ControlReply {
  readonly status: number
  readonly output: string
}

/**
 * News from the event stream. `from` is where `events` start in it: less than what the listener
 * holds when the Machine went back to an earlier moment (a restore, a new network), and everything
 * from there on is replaced.
 */
export interface VmEventUpdate {
  readonly from: number
  readonly events: readonly StampedMachineEvent[]
}

/** One Linux VM: the terminal goes out as bytes, keys come in as text, root has a channel of its own. */
export interface VmSession {
  start(
    options: VmStartOptions,
    onOutput: (bytes: Uint8Array) => void,
    onStatus: (status: VmStatus) => void,
    onEvents?: (update: VmEventUpdate) => void
  ): Promise<void>
  /** Keys for the terminal. Held while the Machine is being set up or restored. */
  input(text: string): void
  resizeTerminal(rows: number, cols: number): void
  /** Back to the clean boot, then the network built on it. Fails with the line that failed and what it printed. */
  setupNetwork(network: NetworkDefinition): Promise<Validated<null>>
  /** Runs a line as root, apart from the player's terminal: a report, a check. */
  control(line: string, timeoutMs?: number): Promise<ControlReply>
  /** Starts or stops dropping every packet on a link, both ways. Its interfaces stay up. */
  setFault(link: LinkDefinition, dropping: boolean): Promise<boolean>
  /** Starts a probe; its replies and losses arrive as events. Fails with every problem in its definition. */
  startProbe(probe: ProbeDefinition): Promise<Validated<null>>
  stopProbe(id: string): Promise<void>
  /** Keeps the Machine as it is now, to come back to: the network, converged and untouched. */
  saveHealthy(): Promise<boolean>
  /** Back to the saved Machine, at the moment it was saved; false when none was saved. */
  restoreHealthy(): Promise<boolean>
  /** The terminal's shell moves into this router's namespace; `null` for the Machine itself. */
  selectRouter(router: string | null): Promise<void>
  stop(): Promise<void>
}
