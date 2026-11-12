import { DEFAULT_MACHINE_CONFIG, type MachineConfig } from '#types/definitions/config'

let _config: MachineConfig = DEFAULT_MACHINE_CONFIG

/** Once at app startup. Options left out keep their defaults. */
export function configureMachine(config: Partial<MachineConfig> = {}): void {
  _config = { ...DEFAULT_MACHINE_CONFIG, ...config }
}

export function getMachineConfig(): MachineConfig {
  return _config
}

export function resetMachineConfig(): void {
  _config = DEFAULT_MACHINE_CONFIG
}
