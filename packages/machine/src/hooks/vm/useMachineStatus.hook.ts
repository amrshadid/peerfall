import { useVmStore } from '#store/vm.store'
import type { VmStatus } from '#types/definitions/vm'

/** Where the Linux VM is (loading, booting, ready, failed), for the status bar. */
export function useMachineStatus(): VmStatus {
  return useVmStore((state) => state.status)
}
