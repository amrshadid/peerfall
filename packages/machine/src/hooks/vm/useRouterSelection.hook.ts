import { useCallback } from 'react'
import { selectVmRouter } from '#services/vm/vm-connection.service'
import { useVmStore } from '#store/vm.store'

export interface UseRouterSelectionResult {
  /** The router the terminal is in, as the Machine last said; null for the Machine itself. */
  readonly router: string | null
  /** Moves the terminal into a router: its shell, its `vtysh`, its interfaces. */
  readonly select: (router: string | null) => Promise<void>
}

export function useRouterSelection(): UseRouterSelectionResult {
  // The Machine says where its shell is after every move and every restore, so this never
  // differs from the terminal: a restore can put the shell back in another router.
  const router = useVmStore((state) => state.router)
  const select = useCallback(async (next: string | null) => {
    await selectVmRouter(next)
  }, [])
  return { router, select }
}
