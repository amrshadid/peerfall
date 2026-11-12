import { useCallback } from 'react'
import { selectVmRouter } from '#services/vm/vm-connection.service'
import { useVmStore } from '#store/vm.store'

export interface UseRouterSelectionResult {
  /** The router the terminal is in; null for the Machine itself. */
  readonly router: string | null
  /** Moves the terminal into a router: its shell, its `vtysh`, its interfaces. */
  readonly select: (router: string | null) => Promise<void>
}

export function useRouterSelection(): UseRouterSelectionResult {
  const router = useVmStore((state) => state.router)
  const select = useCallback(async (next: string | null) => {
    if (await selectVmRouter(next)) {
      useVmStore.getState().setRouter(next)
    }
  }, [])
  return { router, select }
}
