/**
 * What the Machine reports, named after what FRR logs or shows. The terminal aside, these are
 * the only thing the topology, the timeline, the checks and the golden runs read.
 */
export type MachineEvent =
  /** The game started dropping every packet on a link, both ways. Its interfaces stay up. */
  | { readonly type: 'fault_injected'; readonly link: LinkName }
  | { readonly type: 'fault_cleared'; readonly link: LinkName }
  /** bfdd: `state-change: [… peer:10.0.2.2 … ifname:a-c] init -> up`. */
  | { readonly type: 'bfd_session_up'; readonly router: string; readonly peer: string; readonly interface: string }
  /** bfdd: `state-change: […] up -> down reason:control-expired`. */
  | {
      readonly type: 'bfd_session_down'
      readonly router: string
      readonly peer: string
      readonly interface: string
      /**
       * bfdd's reason when the line is its own: `control-expired` when this router stopped hearing
       * the peer, `neighbor-down` when the peer said so. Empty when OSPF reported the session down.
       */
      readonly reason: string
    }
  /** ospfd: `NSM[a-c:10.0.2.1:10.255.0.3:default]: Timer (Inactivity timer expire)`: no hello for the dead interval. */
  | {
      readonly type: 'ospf_dead_timer_expired'
      readonly router: string
      readonly neighbor: string
      readonly interface: string
    }
  /** ospfd: `AdjChg: Nbr 10.255.0.3, NbrIP 10.0.2.2 (default) on a-c:10.0.2.1: Full -> Deleted (InactivityTimer)`. */
  | {
      readonly type: 'ospf_adjacency_change'
      readonly router: string
      /** The neighbor's router id. */
      readonly neighbor: string
      /** The neighbor's address on the link. */
      readonly address: string
      readonly interface: string
      readonly from: string
      readonly to: string
      /** The neighbor state machine's event, as FRR names it: `InactivityTimer`, `LoadingDone`… */
      readonly reason: string
    }
  /** The kernel's routing table gained or replaced a route: what forwarding really uses. */
  | {
      readonly type: 'fib_install'
      readonly router: string
      /** `10.255.0.3` or `10.0.3.0/30`, as `ip route` prints it. */
      readonly prefix: string
      /** The first next hop's address; `null` for a directly connected route. */
      readonly via: string | null
      /** The first next hop's interface. */
      readonly interface: string
      /** Every next hop: more than one when equal-cost paths share the traffic. */
      readonly nextHops: readonly { readonly via: string | null; readonly interface: string }[]
      /** `ospf`, `static`, `kernel`… */
      readonly protocol: string
    }
  | { readonly type: 'fib_remove'; readonly router: string; readonly prefix: string }
  /** A probe's reply came back. */
  | {
      readonly type: 'probe_received'
      readonly probe: string
      readonly sequence: number
      /** Round-trip time in milliseconds, as ping measured it. */
      readonly rttMs: number
    }
  /** No reply came before the next packet was due. */
  | { readonly type: 'probe_lost'; readonly probe: string; readonly sequence: number }

/** A link by its two routers, in the order its definition gives them. */
export type LinkName = readonly [string, string]

export type MachineEventType = MachineEvent['type']

/** What the stream adds to an event. */
export interface MachineEventStamp {
  /**
   * The order it reached the game in. Strictly increasing, starts at 0. Not the order things
   * happened in: a log line is read up to a second after it was written, so sort by `timeMs`.
   */
  readonly seq: number
  /** The Machine's own clock when it happened, in milliseconds since the Unix epoch. */
  readonly timeMs: number
}

/** An event as observers see it. Distributes over the union. */
export type StampedMachineEvent = MachineEvent extends infer Event
  ? Event extends MachineEvent
    ? Event & MachineEventStamp
    : never
  : never

/** A probe: packets from one router to an address, at a steady interval, until it is stopped. */
export interface ProbeDefinition {
  /** Names the probe in its events. */
  readonly id: string
  /** The router it is sent from. */
  readonly from: string
  /** The address it is sent from: a loopback, so the probe survives a link going down. */
  readonly source: string
  readonly destination: string
  readonly intervalMs: number
}
