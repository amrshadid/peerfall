import type { MachineEndpoint } from '#types/definitions/endpoint'

/** Options the app can set once at startup with `configureMachine()`. */
export interface MachineConfig {
  /** Starts the worker that runs the Linux VM. */
  readonly createVmEndpoint: () => MachineEndpoint
  /** Where `pnpm vm:image` put the image, ending in `/` (the app's base path + `vm/`). */
  readonly vmBaseUrl: string
  /** The emulator's wasm; null uses the copy bundled with the worker. */
  readonly vmWasmUrl: string | null
}
