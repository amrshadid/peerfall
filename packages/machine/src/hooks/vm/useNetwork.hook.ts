import { useEffect } from 'react'
import { setupVmNetwork } from '#services/vm/vm-connection.service'
import { type NetworkPhase, useVmStore } from '#store/vm.store'
import type { NetworkDefinition } from '#types/definitions/network'

export interface UseNetworkResult {
  readonly phase: NetworkPhase
  /** Why the network could not be built: the line that failed and what it printed. */
  readonly errors: readonly string[]
}

/**
 * Gives a mission its network: the clean Machine with the routers, links and FRR configuration of
 * `network` built on it, once Linux is up. A new `key` builds it again; the same one keeps the
 * network as the player left it.
 */
export function useNetwork(network: NetworkDefinition | null, key: string): UseNetworkResult {
  const booted = useVmStore(
    (state) => state.status.phase !== 'off' && state.status.phase !== 'loading' && state.status.phase !== 'booting'
  )
  const phase = useVmStore((state) => state.network)
  const errors = useVmStore((state) => state.networkErrors)

  useEffect(() => {
    if (!booted || !network) {
      return
    }
    const store = useVmStore.getState()
    void setupVmNetwork(key, network, () => {
      store.setRouter(null)
      store.setNetwork('building')
    }).then((built) => {
      // null: this VM already has this mission's network.
      if (built) {
        useVmStore.getState().setNetwork(built.ok ? 'ready' : 'failed', built.ok ? [] : built.errors)
      }
    })
  }, [booted, key, network])

  return { phase, errors }
}
