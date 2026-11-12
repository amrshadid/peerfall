import type { ChapterId } from '@peerfall/game/types'
import { PARTS_LABEL, STAGE_PARTS } from './stage-parts.constants'

/** The stage's FRR parts; none for a chapter the table doesn't list. */
export function partsOf(id: ChapterId): readonly string[] {
  return STAGE_PARTS[id] ?? []
}

/** "FRR parts: bfdd, graceful restart, fast reroute, vrrpd"; null with nothing to list. */
export function partsLine(parts: readonly string[]): string | null {
  return parts.length === 0 ? null : `${PARTS_LABEL}: ${parts.join(', ')}`
}
