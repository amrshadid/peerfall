import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { StampedMachineEvent } from '#types/definitions/event'
import type { VmEventUpdate, VmStatus } from '#types/definitions/vm'
import { applyEventUpdate, EMPTY_EVENT_LOG, type EventLog } from '#utils/events/event-order.util'

/** Where a mission's network is on the running Machine. */
export type NetworkPhase = 'none' | 'building' | 'ready' | 'failed'

interface VmState {
  status: VmStatus
  network: NetworkPhase
  /** Why the network could not be built. */
  networkErrors: readonly string[]
  /** The router the terminal is in; null for the Machine itself. */
  router: string | null
  log: EventLog
}

interface VmActions {
  setStatus: (status: VmStatus) => void
  setNetwork: (network: NetworkPhase, errors?: readonly string[]) => void
  setRouter: (router: string | null) => void
  applyEvents: (update: VmEventUpdate) => void
  reset: () => void
}

type VmStore = VmState & VmActions

const initialState: VmState = {
  status: { phase: 'off', detail: null },
  network: 'none',
  networkErrors: [],
  router: null,
  log: EMPTY_EVENT_LOG,
}

export const useVmStore = create<VmStore>()(
  devtools(
    (set) => ({
      ...initialState,
      setStatus: (status) => set({ status }),
      setNetwork: (network, errors = []) => set({ network, networkErrors: errors }),
      setRouter: (router) => set({ router }),
      applyEvents: (update) => set((state) => ({ log: applyEventUpdate(state.log, update) })),
      reset: () => set(initialState),
    }),
    { name: 'VmStore' }
  )
)

/** The Machine's events in the order they happened. */
export const selectEvents = (state: VmState): readonly StampedMachineEvent[] => state.log.events
