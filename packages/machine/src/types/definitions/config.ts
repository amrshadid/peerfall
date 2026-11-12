export interface MachineConfig {
  /** Where the built image is served from, ending in `/`. */
  readonly vmBaseUrl: string
}

export const DEFAULT_MACHINE_CONFIG: MachineConfig = { vmBaseUrl: '/vm/' }
