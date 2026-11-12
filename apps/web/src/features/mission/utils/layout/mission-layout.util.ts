import type { MissionPanels } from '@features/mission/types'
import type { PanelSizes } from '@shared/types'

export interface HeaderReach {
  /** The header's right edge, in viewport px. */
  readonly headerRight: number
  /** The rule on the header's right side, which stands over the panel's divider. */
  readonly ruleWidth: number
  /** The panel's left edge, in viewport px. */
  readonly panelLeft: number
  readonly remPx: number
}

// In rem, the unit the Guide's size is kept in; null before both are laid out.
export function headerWidthRem({ headerRight, ruleWidth, panelLeft, remPx }: HeaderReach): number | null {
  const width = headerRight - ruleWidth - panelLeft
  return width > 0 && remPx > 0 ? width / remPx : null
}

/** The network dock is there once either of its panels is. */
export function hasNetworkDock(panels: MissionPanels): boolean {
  return panels.topology || panels.timeline
}

/**
 * The panels on show, as one string that changes whenever the mission opens another: what a
 * container hands to the tour, so a new panel gets its stop the first time it appears.
 */
export function openPanelsKey(panels: MissionPanels): string {
  return ['guide', 'terminal', ...(['editor', 'topology', 'timeline'] as const).filter((panel) => panels[panel])].join(
    ','
  )
}

/** Every panel open, for a player who chose to see them all at once. */
export function panelsFor(unlocked: MissionPanels, showAll: boolean): MissionPanels {
  return showAll ? { editor: true, topology: true, timeline: true } : unlocked
}

/** Only sizes the player chose are set as custom properties; otherwise each screen width keeps its own default. */
export function sizeVariables(sizes: PanelSizes, guideMinRem: number): Readonly<Record<`--${string}`, string>> {
  return {
    '--guide-min': `${guideMinRem}rem`,
    ...(sizes.guide === null ? {} : { '--guide-w': `${sizes.guide}rem` }),
    ...(sizes.network === null ? {} : { '--network-w': `${sizes.network}rem` }),
    ...(sizes.editor === null ? {} : { '--editor-share': `${sizes.editor}%` }),
  }
}
