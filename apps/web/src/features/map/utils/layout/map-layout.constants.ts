// The drawing's measurements, in px.

/** Connectors run down the sheet this far in from each side. */
export const EDGE = 18
/** Text and stops keep this far in from each side, clear of the connectors. */
export const PAD = 44
/** A row of stops keeps this much further in than the text, so end stops clear the turn. */
export const ROW_INSET = 10
/** Above the first stage. */
export const TOP = 6
/** The narrowest and widest a stop's cell gets; the row count follows from these. */
export const MIN_CELL = 104
export const MAX_CELL = 176
/** From a row's top to its stops' centre: room for the "You are here" flag. */
export const STOP_DROP = 56
/** From a stop's centre to its number's baseline. */
export const NUM_DROP = 34
/** Between the lines of a stop's wrapped title. */
export const LINE = 15
/** From a planned stage's header to its pencilled stretch of road: no flag ever stands there. */
export const PLANNED_DROP = 36
/** A stop's NodeMark square. */
export const NODE_SIZE = 22
/** Where "you" sits in the overview's window, from its top: the road ahead runs down, so it gets more room. */
export const OVERVIEW_HERE_AT = 0.4

/** The one router the journey starts from, drawn above the first stage. */
export const ORIGIN = {
  /** From the sheet's top to the router's box. */
  drop: 14,
  width: 58,
  height: 36,
  /** Between the box and its words. */
  gap: 14,
  /** Under the box, before the first stage's header. */
  below: 8,
} as const

/** The operated network the journey ends at: its routers on one backbone. */
export const TERMINUS = {
  /** The routers and what each one runs, left to right. */
  routers: [
    ['OSPF', 'IS-IS'],
    ['BGP', 'policy'],
    ['VRF', 'EVPN'],
    ['MPLS', 'SRv6'],
    ['PIM', 'MSDP'],
  ],
  gap: 12,
  boxHeight: 50,
  /** From a box's top to the backbone under it. */
  busDrop: 78,
  /** Under the backbone: room for its caption. */
  below: 20,
} as const
