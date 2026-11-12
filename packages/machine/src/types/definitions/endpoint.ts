import type { Endpoint } from 'comlink'

/** Where the VM runs: its worker, or a message port in tests. */
export interface MachineEndpoint extends Endpoint {
  terminate(): void
}
