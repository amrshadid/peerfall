import type { Validated } from '@peerfall/core/types'
import { proxy, type Remote, wrap } from 'comlink'
import { getMachineConfig } from '#config'
import { applyRouterConfig, readRouterConfig } from '#services/vm/vm-config.service'
import { readMachineState, restartRouterFrr } from '#services/vm/vm-inspect.service'
import type { MachineEndpoint } from '#types/definitions/endpoint'
import type { ProbeDefinition } from '#types/definitions/event'
import { type LinkDefinition, type NetworkDefinition, ROUTER_NAME } from '#types/definitions/network'
import type { MachineState, StateRequest } from '#types/definitions/state'
import type { ControlReply, VmEventUpdate, VmSession, VmShellUpdate, VmStatus } from '#types/definitions/vm'

interface VmConnection {
  readonly endpoint: MachineEndpoint
  readonly session: Remote<VmSession>
}

let connection: VmConnection | null = null
/** Mounted users; the VM stops when the last one leaves. */
let users = 0
const outputListeners = new Set<(bytes: Uint8Array) => void>()
/** The network each running VM was last set up for. */
const networkKeys = new WeakMap<VmConnection, string>()
let terminalSize: { rows: number; cols: number } | null = null

const NOT_RUNNING: Validated<null> = { ok: false, errors: ['The Machine is not running'] }

/** The first user starts the VM in its worker. */
export function connectVm(
  onStatus: (status: VmStatus) => void,
  onEvents: (update: VmEventUpdate) => void,
  onShell: (update: VmShellUpdate) => void = () => {}
): { started: boolean } {
  users++
  if (connection !== null) {
    return { started: false }
  }
  const config = getMachineConfig()
  const endpoint = config.createVmEndpoint()
  const started: VmConnection = { endpoint, session: wrap<VmSession>(endpoint) }
  connection = started
  void started.session.start(
    { baseUrl: config.vmBaseUrl, ...(config.vmWasmUrl === null ? {} : { wasmUrl: config.vmWasmUrl }) },
    proxy((bytes: Uint8Array) => {
      for (const listener of [...outputListeners]) {
        listener(bytes)
      }
    }),
    proxy((status: VmStatus) => {
      // A status from a VM that was stopped and replaced is stale.
      if (connection === started) {
        onStatus(status)
      }
    }),
    proxy((update: VmEventUpdate) => {
      if (connection === started) {
        onEvents(update)
      }
    }),
    proxy((update: VmShellUpdate) => {
      if (connection === started) {
        onShell(update)
      }
    })
  )
  if (terminalSize) {
    void started.session.resizeTerminal(terminalSize.rows, terminalSize.cols)
  }
  return { started: true }
}

/** Removes a user. True when this call stopped the VM. */
export function disconnectVm(): { stopped: boolean } {
  users = Math.max(0, users - 1)
  if (users > 0 || connection === null) {
    return { stopped: false }
  }
  const closed = connection
  connection = null
  void closed.session.stop().finally(() => closed.endpoint.terminate())
  return { stopped: true }
}

/** Keys typed at the terminal; dropped while no VM runs. */
export function sendToVm(text: string): void {
  void connection?.session.input(text)
}

/** Every terminal byte from now on; returns the unsubscribe. */
export function onVmOutput(listener: (bytes: Uint8Array) => void): () => void {
  outputListeners.add(listener)
  return () => {
    outputListeners.delete(listener)
  }
}

/** The terminal's size, for this VM and any started later. */
export function resizeVmTerminal(rows: number, cols: number): void {
  terminalSize = { rows, cols }
  void connection?.session.resizeTerminal(rows, cols)
}

/**
 * Builds a mission's network on the clean Machine. Once per `key` per VM, so coming back to the
 * same mission's screen keeps the network the player changed; `null` when it was already built.
 * `onStart` runs only when the build really begins.
 */
export async function setupVmNetwork(
  key: string,
  network: NetworkDefinition,
  onStart?: () => void
): Promise<Validated<null> | null> {
  const running = connection
  if (!running) {
    return NOT_RUNNING
  }
  if (networkKeys.get(running) === key) {
    return null
  }
  networkKeys.set(running, key)
  onStart?.()
  const built = await running.session.setupNetwork(network)
  if (!built.ok) {
    // A failed build may be tried again.
    networkKeys.delete(running)
  }
  return built
}

/** Runs a line as root on the Machine; null while no VM runs. */
export async function runVmControl(line: string, timeoutMs?: number): Promise<ControlReply | null> {
  const running = connection
  return running ? running.session.control(line, timeoutMs) : null
}

/** Starts or stops dropping a link's packets; false when it could not. */
export async function setVmFault(link: LinkDefinition, dropping: boolean): Promise<boolean> {
  const running = connection
  return running ? running.session.setFault(link, dropping) : false
}

export async function startVmProbe(probe: ProbeDefinition): Promise<Validated<null>> {
  const running = connection
  return running ? running.session.startProbe(probe) : NOT_RUNNING
}

export async function stopVmProbe(id: string): Promise<void> {
  await connection?.session.stopProbe(id)
}

/** Keeps the Machine as it is now, to come back to; false when it could not. */
export async function saveVmHealthy(slot?: string): Promise<boolean> {
  const running = connection
  return running ? running.session.saveHealthy(slot) : false
}

/** Back to the saved Machine; false when none was saved. */
export async function restoreVmHealthy(slot?: string): Promise<boolean> {
  const running = connection
  return running ? running.session.restoreHealthy(slot) : false
}

/** Moves the terminal into a router; false while no VM runs. */
export async function selectVmRouter(router: string | null): Promise<boolean> {
  const running = connection
  if (!running) {
    return false
  }
  await running.session.selectRouter(router)
  return true
}

/** A router's running configuration as text; null while no VM runs or the router does not answer. */
export async function readVmRouterConfig(router: string): Promise<string | null> {
  const running = connection
  if (!running || !ROUTER_NAME.test(router)) {
    return null
  }
  return readRouterConfig((line) => running.session.control(line), router)
}

/** The Machine as it is now: the asked parts of each router and the pings, read as root. */
export async function readVmMachineState(request: StateRequest): Promise<Validated<MachineState>> {
  const running = connection
  if (!running) {
    return { ok: false, errors: ['The Machine is not running'] }
  }
  return readMachineState((line, timeoutMs) => running.session.control(line, timeoutMs), request)
}

/** Stops a router's FRR and starts it again from its saved frr.conf, with FRR's own init script. */
export async function restartVmFrr(router: string): Promise<Validated<null>> {
  const running = connection
  if (!running) {
    return NOT_RUNNING
  }
  return restartRouterFrr((line, timeoutMs) => running.session.control(line, timeoutMs), router)
}

/**
 * Makes a router's configuration the edited text: only what differs from its running
 * configuration is typed into its vtysh, as frr-reload does on a real router. Fails with
 * FRR's own messages for the lines it refused; the lines it accepted stay applied.
 */
export async function applyVmRouterConfig(router: string, config: string): Promise<Validated<null>> {
  const running = connection
  if (!running || !ROUTER_NAME.test(router)) {
    return NOT_RUNNING
  }
  return applyRouterConfig((line) => running.session.control(line), router, config)
}
