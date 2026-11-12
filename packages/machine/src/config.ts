import type { MachineConfig } from '#types/definitions/config'

// Written here, not in types/, because Vite bundles the worker only when it sees
// `new Worker(new URL(…, import.meta.url))`, with the path relative to this file.
const DEFAULT_MACHINE_CONFIG: MachineConfig = {
  createVmEndpoint: () => new Worker(new URL('./services/vm/vm.worker.ts', import.meta.url), { type: 'module' }),
  vmBaseUrl: '/vm/',
  vmWasmUrl: null,
}

let _config: MachineConfig = DEFAULT_MACHINE_CONFIG

/** Once at app startup, before the first `useLinuxTerminal()`. Options left out keep their defaults. */
export function configureMachine(config: Partial<MachineConfig> = {}): void {
  _config = { ...DEFAULT_MACHINE_CONFIG, ...config }
}

export function getMachineConfig(): MachineConfig {
  return _config
}

export function resetMachineConfig(): void {
  _config = DEFAULT_MACHINE_CONFIG
}
