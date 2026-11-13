import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { StampedMachineEvent } from '#types/definitions/event'
import type { InterfaceState, MachineState } from '#types/definitions/state'
import type { VmEventUpdate, VmShellUpdate, VmStatus } from '#types/definitions/vm'
import { applyEventUpdate, EMPTY_EVENT_LOG, type EventLog } from '#utils/events/event-order.util'

/** Where a mission's network is on the running Machine. */
export type NetworkPhase = 'none' | 'building' | 'ready' | 'failed'

interface VmState {
  status: VmStatus
  network: NetworkPhase
  /** Why the network could not be built. */
  networkErrors: readonly string[]
  /** The router the terminal is in, as the Machine last said; null for the Machine itself. */
  router: string | null
  /**
   * Commands the player finished at the terminal since the Machine started: each return to a
   * bash or vtysh prompt after an Enter. Only ever grows, so a change means "a command finished".
   */
  commandsFinished: number
  log: EventLog
  /**
   * Each router's interfaces as the state was last read, by router; a router never read is
   * missing. Forgotten when a network is built or the Machine is restored, where they changed.
   */
  interfaces: Readonly<Record<string, readonly InterfaceState[]>>
}

interface VmActions {
  setStatus: (status: VmStatus) => void
  setNetwork: (network: NetworkPhase, errors?: readonly string[]) => void
  setRouter: (router: string | null) => void
  /** The Machine's news about its terminal: where the shell is, and how many commands finished. */
  applyShell: (update: VmShellUpdate) => void
  applyEvents: (update: VmEventUpdate) => void
  /** Keeps the interfaces a state read found; routers it did not read them on keep their last reading. */
  recordInterfaces: (state: MachineState) => void
  forgetInterfaces: () => void
  reset: () => void
}

type VmStore = VmState & VmActions

const initialState: VmState = {
  status: { phase: 'off', detail: null },
  network: 'none',
  networkErrors: [],
  router: null,
  commandsFinished: 0,
  log: EMPTY_EVENT_LOG,
  interfaces: {},
}

const NO_INTERFACES: VmState['interfaces'] = {}

export const useVmStore = create<VmStore>()(
  devtools(
    (set) => ({
      ...initialState,
      setStatus: (status) => set({ status }),
      setNetwork: (network, errors = []) =>
        set(
          network === 'building'
            ? { network, networkErrors: errors, interfaces: NO_INTERFACES }
            : { network, networkErrors: errors }
        ),
      setRouter: (router) => set({ router }),
      applyShell: ({ router, commandsFinished }) =>
        // The count only grows: news from a VM replaced since must not take it back.
        set((state) => ({ router, commandsFinished: Math.max(state.commandsFinished, commandsFinished) })),
      applyEvents: (update) => set((state) => ({ log: applyEventUpdate(state.log, update) })),
      recordInterfaces: ({ routers }) => {
        const read = Object.entries(routers).flatMap(([router, { links }]) =>
          links === undefined ? [] : [[router, links] as const]
        )
        if (read.length > 0) {
          set((state) => ({ interfaces: { ...state.interfaces, ...Object.fromEntries(read) } }))
        }
      },
      forgetInterfaces: () => set({ interfaces: NO_INTERFACES }),
      reset: () => set(initialState),
    }),
    { name: 'VmStore' }
  )
)

/** The Machine's events in the order they happened. */
export const selectEvents = (state: VmState): readonly StampedMachineEvent[] => state.log.events
