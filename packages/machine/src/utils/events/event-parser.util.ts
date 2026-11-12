import type { MachineEvent } from '#types/definitions/event'

/** An event and the Machine's clock when it happened, in milliseconds since the Unix epoch. */
export interface TimedEvent {
  readonly timeMs: number
  readonly event: MachineEvent
}

// `2026/11/12 17:33:53.077 BFD: [SEY1D-NT8EQ] state-change: …`; an error line carries a second `[EC n]`.
const FRR_LINE = /^(\d{4})\/(\d\d)\/(\d\d) (\d\d):(\d\d):(\d\d)\.(\d{3}) (\w+): \[[^\]]+\](?:\[[^\]]+\])? (.*)$/
// reads bfdd/bfd.c: ptm_bfd_sess_up() and ptm_bfd_sess_dn()'s log lines
const BFD_STATE =
  /^state-change: \[mhop:\S+ peer:(\S+) local:\S+ vrf:\S+ ifname:(\S+)\] (\S+) -> (\S+?)(?: reason:(\S+))?$/
// reads ospfd/ospf_bfd.c: ospf_bfd_session_change()'s log line: `NSM[a-c:10.0.2.1:10.0.2.2]: BFD Down`
const OSPF_BFD = /^ospf_bfd_session_change: NSM\[([^:\]]+):[^:\]]+:([^\]]+)\]: BFD (Up|Down)$/
// reads ospfd/ospf_nsm.c: ospf_inactivity_timer()'s log line
const OSPF_DEAD_TIMER = /^NSM\[([^:\]]+):[^:\]]+:([^:\]]+):[^\]]*\]: Timer \(Inactivity timer expire\)$/
// reads ospfd/ospf_nsm.c: nsm_notice_state_change()'s log line
const OSPF_ADJACENCY = /^AdjChg: Nbr (\S+), NbrIP (\S+) \(\S+\) on ([^:\s]+):\S+: (\S+) -> (\S+) \((\w+)\)$/

// `[2026-11-12T17:33:53.110831] 10.255.0.3 nhid 18 via 10.0.1.2 dev a-b proto ospf metric 20`, from
// `ip -o -ts monitor route`: -o keeps a route with several next hops on one line.
const ROUTE_LINE = /^\[(\d{4})-(\d\d)-(\d\d)T(\d\d):(\d\d):(\d\d)\.(\d{6})\] (Deleted )?(\S+)(.*)$/
const NEXT_HOP = /(?:via (\S+) )?dev (\S+)/g
const PROTOCOL = /proto (\S+)/

// `[1794504832.282240] 64 bytes from 10.255.0.3: icmp_seq=15 ttl=64 time=0.375 ms`, or with ping's
// -O, `[1794504832.697922] no answer yet for icmp_seq=16`.
const PING_LINE =
  /^\[(\d+)\.(\d{6})\] (?:\d+ bytes from \S+ icmp_seq=(\d+) .*time=([\d.]+) ms|no answer yet for icmp_seq=(\d+))$/

// `on a c 1794504832.462712`: the game's own line, stamped with bash's EPOCHREALTIME.
const FAULT_LINE = /^(on|off) (\S+) (\S+) (\d+)\.(\d{6})$/

// The Machine's clock is UTC, and FRR and ip print local time without a zone.
const utcMs = (parts: readonly (string | undefined)[], fractionMs: number): number => {
  const [year, month, day, hour, minute, second] = parts.map(Number)
  return Date.UTC(year ?? 0, (month ?? 1) - 1, day, hour, minute, second) + fractionMs
}

const epochMs = (seconds: string | undefined, micros: string | undefined): number =>
  Number(seconds) * 1000 + Number(micros) / 1000

function parseFrr(router: string, line: string): TimedEvent | null {
  const match = FRR_LINE.exec(line)
  if (!match) {
    return null
  }
  const timeMs = utcMs(match.slice(1, 7), Number(match[7]))
  const daemon = match[8]
  const message = match[9] ?? ''
  if (daemon === 'BFD') {
    const [, peer = '', name = '', from, to, reason] = BFD_STATE.exec(message) ?? []
    if (to === 'up') {
      return { timeMs, event: { type: 'bfd_session_up', router, peer, interface: name } }
    }
    // Only a session that was up went down: `init -> down` is one that never formed.
    if (from === 'up' && to === 'down') {
      return { timeMs, event: { type: 'bfd_session_down', router, peer, interface: name, reason: reason ?? '' } }
    }
    return null
  }
  if (daemon !== 'OSPF') {
    return null
  }
  // BFD as OSPF heard it, a millisecond or two after bfdd decided: the moment routing reacts to.
  const bfd = OSPF_BFD.exec(message)
  if (bfd) {
    const session = { router, interface: bfd[1] ?? '', peer: bfd[2] ?? '' }
    return bfd[3] === 'Up'
      ? { timeMs, event: { type: 'bfd_session_up', ...session } }
      : { timeMs, event: { type: 'bfd_session_down', ...session, reason: '' } }
  }
  const dead = OSPF_DEAD_TIMER.exec(message)
  if (dead) {
    return {
      timeMs,
      event: { type: 'ospf_dead_timer_expired', router, interface: dead[1] ?? '', neighbor: dead[2] ?? '' },
    }
  }
  const [, neighbor, address, name, from, to, reason] = OSPF_ADJACENCY.exec(message) ?? []
  if (neighbor === undefined) {
    return null
  }
  return {
    timeMs,
    event: {
      type: 'ospf_adjacency_change',
      router,
      neighbor,
      address: address ?? '',
      interface: name ?? '',
      from: from ?? '',
      to: to ?? '',
      reason: reason ?? '',
    },
  }
}

function parseRoute(router: string, line: string): TimedEvent | null {
  const match = ROUTE_LINE.exec(line)
  if (!match) {
    return null
  }
  const timeMs = utcMs(match.slice(1, 7), Number(match[7]) / 1000)
  const prefix = match[9] ?? ''
  if (match[8]) {
    return { timeMs, event: { type: 'fib_remove', router, prefix } }
  }
  const rest = match[10] ?? ''
  const nextHops = [...rest.matchAll(NEXT_HOP)].map((hop) => ({ via: hop[1] ?? null, interface: hop[2] ?? '' }))
  const [first] = nextHops
  if (!first) {
    return null
  }
  return {
    timeMs,
    event: {
      type: 'fib_install',
      router,
      prefix,
      via: first.via,
      interface: first.interface,
      nextHops,
      protocol: PROTOCOL.exec(rest)?.[1] ?? '',
    },
  }
}

function parseProbe(probe: string, line: string): TimedEvent | null {
  const match = PING_LINE.exec(line)
  if (!match) {
    return null
  }
  const timeMs = epochMs(match[1], match[2])
  return match[3] !== undefined
    ? { timeMs, event: { type: 'probe_received', probe, sequence: Number(match[3]), rttMs: Number(match[4]) } }
    : { timeMs, event: { type: 'probe_lost', probe, sequence: Number(match[5]) } }
}

function parseFault(line: string): TimedEvent | null {
  const match = FAULT_LINE.exec(line)
  if (!match) {
    return null
  }
  const link = [match[2] ?? '', match[3] ?? ''] as const
  return {
    timeMs: epochMs(match[4], match[5]),
    event: { type: match[1] === 'on' ? 'fault_injected' : 'fault_cleared', link },
  }
}

/**
 * One line of the Machine's event port: `<source> <name> <the line as its program printed it>`, e.g.
 * `frr a 2026/11/12 17:33:53.077 BFD: […] state-change: …`. Lines that tell the game nothing (most
 * of a log) are `null`.
 */
export function parseEventLine(line: string): TimedEvent | null {
  const text = line.replace(/\r$/, '')
  const space = text.indexOf(' ')
  const source = text.slice(0, space)
  const rest = text.slice(space + 1)
  if (source === 'fault') {
    return parseFault(rest)
  }
  const at = rest.indexOf(' ')
  if (space === -1 || at === -1) {
    return null
  }
  const name = rest.slice(0, at)
  const payload = rest.slice(at + 1)
  switch (source) {
    case 'frr':
      return parseFrr(name, payload)
    case 'fib':
      return parseRoute(name, payload)
    case 'probe':
      return parseProbe(name, payload)
    default:
      return null
  }
}
