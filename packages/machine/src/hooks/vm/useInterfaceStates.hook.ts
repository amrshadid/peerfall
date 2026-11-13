import { useVmStore } from '#store/vm.store'
import type { InterfaceState } from '#types/definitions/state'

/**
 * Each router's interfaces as the Machine's state was last read, by router name: whether each one
 * has carrier. A router whose interfaces were not read since the network was built or restored is
 * missing, so a caller can tell "not known" from "down".
 */
export function useInterfaceStates(): Readonly<Record<string, readonly InterfaceState[]>> {
  return useVmStore((state) => state.interfaces)
}
