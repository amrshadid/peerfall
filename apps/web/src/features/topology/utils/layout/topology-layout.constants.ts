import type { LinkState } from '@features/topology/types'
import type { ICON_PATHS } from '@shared/constants/icons'

/** The drawing's box, in the percent units every position is given in. */
export const STAGE = { width: 100, height: 100, centerX: 50, centerY: 50 } as const

/** How far routers sit from the centre: wide enough to read the links, clear of the box's edge. */
export const RING = { radiusX: 34, radiusY: 30 } as const

/** Degrees, for placing routers round the ring. */
export const TURN = { full: 360, half: 180, quarter: 90 } as const

/** A link's state in words and as an icon: never by its line or colour alone. */
export const LINK_STATE_TEXT: Readonly<
  Record<LinkState, { readonly label: string; readonly icon: keyof typeof ICON_PATHS }>
> = {
  up: { label: 'up', icon: 'link-up' },
  dropping: { label: 'dropping packets', icon: 'link-dropping' },
  down: { label: 'down', icon: 'link-down' },
}

export const DEFAULT_PATH_LABEL = 'Path'
export const PATH_ARROW = ' → '
/** Between two paths that share the traffic. */
export const PATH_ALSO = ' and '

/** The drawing's OSPF words, said once in plain language under it. */
export const ADJACENCY_LEGEND =
  'OSPF Full: the two routers on a link are neighbors and have told each other every route they know. OSPF lost: one of them has given up on the other.'
