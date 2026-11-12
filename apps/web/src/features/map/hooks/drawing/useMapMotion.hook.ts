import { useSettings } from '@app/store'
import { useReducedMotion } from '@shared/hooks/motion'

/** True when the system or the game's Motion setting asks for less motion: the map jumps instead of gliding. */
export function useMapMotion(): boolean {
  const systemReduced = useReducedMotion()
  const { settings } = useSettings()
  return systemReduced || settings.motion === 'reduce'
}
