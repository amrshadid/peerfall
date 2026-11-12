import type { DetectionEvent } from '@peerfall/game/types'

/** What noticed a dead neighbor, as a player reads it. */
export const DETECTOR_NAMES: Readonly<Record<DetectionEvent, string>> = {
  bfd_session_down: 'BFD',
  ospf_dead_timer_expired: "OSPF's dead timer",
}

/** Each term, said once in plain words beside the evidence that first shows it. */
export const TERMS = {
  reply: 'A reply is one probe packet that reached the far router and came back.',
  route:
    "A route is the entry in a router's table that says where packets for a destination leave. Without one they are dropped.",
  interface:
    "An interface is a router's end of a link. Here each is named after the two routers it joins: `a-c` is a's end of the link to c.",
  detectors:
    "BFD is a small protocol whose only job is to notice a dead path fast. OSPF's dead timer is how long OSPF waits without hearing a neighbor before it gives up on it.",
} as const

/** Reads after "Last run:". */
export const NOT_TESTED = 'the link was not broken, and this is judged only when it breaks. Use **Break the link**.'
