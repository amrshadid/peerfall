import type { MissionId } from '#types/definitions/mission'

/** Where a command is typed: in vtysh, FRR's console, or at the router's Linux shell. */
export const FIELD_GUIDE_KINDS = ['vtysh', 'shell'] as const

export type FieldGuideKind = (typeof FIELD_GUIDE_KINDS)[number]

/** One row of the Field Guide, the Codex page of commands. */
export interface FieldGuideEntry {
  /** As the player types it: `show ip route`, `ip address`, `write memory`. */
  readonly name: string
  readonly kind: FieldGuideKind
  /** One line: what it does. */
  readonly what: string
  /** The mission where the player first meets it: the entry appears when that mission starts. */
  readonly firstMet: MissionId
  /** The missions that use it again or teach what is underneath. */
  readonly deepenedIn: readonly MissionId[]
}

/** `field-guide.yaml`: its entries in the order the page lists them. */
export interface FieldGuide {
  readonly entries: readonly FieldGuideEntry[]
}

/** The page as the player has it now. */
export interface FieldGuideView {
  /** False until the mission of its first entry has been started. */
  readonly open: boolean
  /** The entries met so far, in the guide's order. */
  readonly entries: readonly FieldGuideEntry[]
}
