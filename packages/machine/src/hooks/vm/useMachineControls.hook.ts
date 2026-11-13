import type { Validated } from '@peerfall/core/types'
import { useMemo } from 'react'
import {
  restoreVmHealthy,
  runVmControl,
  saveVmHealthy,
  setVmFault,
  startVmProbe,
  stopVmProbe,
} from '#services/vm/vm-connection.service'
import { useVmStore } from '#store/vm.store'
import type { ProbeDefinition } from '#types/definitions/event'
import type { LinkDefinition } from '#types/definitions/network'
import type { ControlReply } from '#types/definitions/vm'

export interface UseMachineControlsResult {
  /** Starts or stops dropping every packet on a link, both ways; its interfaces stay up. */
  readonly setFault: (link: LinkDefinition, dropping: boolean) => Promise<boolean>
  /** Starts a probe; its replies and losses arrive as events. */
  readonly startProbe: (probe: ProbeDefinition) => Promise<Validated<null>>
  readonly stopProbe: (id: string) => Promise<void>
  /** Keeps the Machine as it is now: the network, converged and untouched. */
  readonly saveHealthy: (slot?: string) => Promise<boolean>
  /** Back to the saved Machine, at the moment it was saved; the events go back with it. */
  readonly restoreHealthy: (slot?: string) => Promise<boolean>
  /** Runs a line as root, apart from the player's terminal; null while no VM runs. */
  readonly run: (line: string, timeoutMs?: number) => Promise<ControlReply | null>
}

/** What a mission does to the Machine beside the player's own typing. */
export function useMachineControls(): UseMachineControlsResult {
  return useMemo(
    () => ({
      setFault: setVmFault,
      startProbe: startVmProbe,
      stopProbe: stopVmProbe,
      saveHealthy: saveVmHealthy,
      restoreHealthy: async (slot) => {
        // The saved Machine's interfaces may differ from the last reading.
        useVmStore.getState().forgetInterfaces()
        return restoreVmHealthy(slot)
      },
      run: runVmControl,
    }),
    []
  )
}
