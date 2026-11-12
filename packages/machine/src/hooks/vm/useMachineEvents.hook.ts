import { selectEvents, useVmStore } from '#store/vm.store'
import type { StampedMachineEvent } from '#types/definitions/event'

/**
 * Everything the Machine has reported since the network was built, in the order it happened:
 * what the topology, the timeline and the checks read. Goes back with the Machine on a restore.
 */
export function useMachineEvents(): readonly StampedMachineEvent[] {
  return useVmStore(selectEvents)
}
