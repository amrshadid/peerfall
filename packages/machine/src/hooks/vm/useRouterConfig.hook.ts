import type { Validated } from '@peerfall/core/types'
import { useMemo } from 'react'
import { applyVmRouterConfig, readVmRouterConfig } from '#services/vm/vm-connection.service'

export interface UseRouterConfigResult {
  /** A router's running configuration, as `show running-config` gives it; null while it cannot be read. */
  readonly read: (router: string) => Promise<string | null>
  /**
   * Makes the router's configuration the edited text. Only what differs is typed into its vtysh,
   * as frr-reload does on a real router; FRR's own messages come back for the lines it refused.
   */
  readonly apply: (router: string, config: string) => Promise<Validated<null>>
}

/** The editor's way to a router's configuration. */
export function useRouterConfig(): UseRouterConfigResult {
  return useMemo(() => ({ read: readVmRouterConfig, apply: applyVmRouterConfig }), [])
}
