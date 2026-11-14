import type { VmPhase } from '@peerfall/machine/types'
import { NETWORK_STATUS_TEXT } from './machine-lock.constants'

/**
 * The status bar's word on a mission's network while the Machine itself is ready, or null when the
 * Machine's own word stands. Linux is up before the network is: between the boot and the build, and
 * while routing settles behind the plate, "running" would say the routers are there to use.
 * `run` is the mission run's phase (`building`, `settling`, `ready`…), null without a mission.
 */
export function networkStatusOf(machine: VmPhase, run: string | null): string | null {
  if (machine !== 'ready') {
    return null
  }
  if (run === 'building') {
    return NETWORK_STATUS_TEXT.building
  }
  if (run === 'settling') {
    return NETWORK_STATUS_TEXT.settling
  }
  return null
}
