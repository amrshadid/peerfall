import { describe, expect, it } from 'vitest'
import { parseEventLine } from '#utils/events/event-parser.util'

// Every line here is copied from a run on the Machine (FRR 10.6.1), not typed.
const at = (iso: string) => Date.parse(iso)

describe('the Machine’s event lines', () => {
  it('reads a BFD session coming up', () => {
    expect(
      parseEventLine(
        'frr a 2026/11/12 17:33:45.265 BFD: [J1C6V-VMRW5] state-change: [mhop:no peer:10.0.2.2 local:10.0.2.1 vrf:default ifname:a-c] down -> up'
      )
    ).toEqual({
      timeMs: at('2026-11-12T17:33:45.265Z'),
      event: { type: 'bfd_session_up', router: 'a', peer: '10.0.2.2', interface: 'a-c' },
    })
    expect(
      parseEventLine(
        'frr a 2026/11/12 16:32:52.849 BFD: [J1C6V-VMRW5] state-change: [mhop:no peer:10.0.2.2 local:10.0.2.1 vrf:default ifname:a-c] init -> up'
      )?.event.type
    ).toBe('bfd_session_up')
  })

  it('reads a BFD session going down, and why', () => {
    expect(
      parseEventLine(
        'frr a 2026/11/12 17:33:53.077 BFD: [SEY1D-NT8EQ] state-change: [mhop:no peer:10.0.2.2 local:10.0.2.1 vrf:default ifname:a-c] up -> down reason:control-expired'
      )
    ).toEqual({
      timeMs: at('2026-11-12T17:33:53.077Z'),
      event: { type: 'bfd_session_down', router: 'a', peer: '10.0.2.2', interface: 'a-c', reason: 'control-expired' },
    })
  })

  it('reads the OSPF dead timer expiring', () => {
    expect(
      parseEventLine(
        'frr a 2026/11/12 16:14:37.712 OSPF: [YZVTF-RQXRK] NSM[a-c:10.0.2.1:10.255.0.3:default]: Timer (Inactivity timer expire)'
      )
    ).toEqual({
      timeMs: at('2026-11-12T16:14:37.712Z'),
      event: { type: 'ospf_dead_timer_expired', router: 'a', interface: 'a-c', neighbor: '10.255.0.3' },
    })
  })

  it('reads an adjacency change with the state machine’s event', () => {
    expect(
      parseEventLine(
        'frr a 2026/11/12 17:33:53.090 OSPF: [Y05P2-YJVXY] AdjChg: Nbr 10.255.0.3, NbrIP 10.0.2.2 (default) on a-c:10.0.2.1: Full -> Deleted (InactivityTimer)'
      )
    ).toEqual({
      timeMs: at('2026-11-12T17:33:53.090Z'),
      event: {
        type: 'ospf_adjacency_change',
        router: 'a',
        neighbor: '10.255.0.3',
        address: '10.0.2.2',
        interface: 'a-c',
        from: 'Full',
        to: 'Deleted',
        reason: 'InactivityTimer',
      },
    })
  })

  it('reads a route the kernel installed, with its next hop', () => {
    expect(
      parseEventLine('fib a [2026-11-12T17:33:53.110831] 10.255.0.3 nhid 18 via 10.0.1.2 dev a-b proto ospf metric 20 ')
    ).toEqual({
      timeMs: at('2026-11-12T17:33:53.110Z') + 0.831,
      event: {
        type: 'fib_install',
        router: 'a',
        prefix: '10.255.0.3',
        via: '10.0.1.2',
        interface: 'a-b',
        nextHops: [{ via: '10.0.1.2', interface: 'a-b' }],
        protocol: 'ospf',
      },
    })
  })

  it('reads a route with two equal next hops, kept on one line by ip -o', () => {
    const parsed = parseEventLine(
      'fib a [2026-11-12T17:33:43.626802] 10.0.3.0/30 nhid 17 proto ospf metric 20 \\\tnexthop via 10.0.1.2 dev a-b weight 1 \\\tnexthop via 10.0.2.2 dev a-c weight 1 '
    )
    expect(parsed?.event).toEqual({
      type: 'fib_install',
      router: 'a',
      prefix: '10.0.3.0/30',
      via: '10.0.1.2',
      interface: 'a-b',
      nextHops: [
        { via: '10.0.1.2', interface: 'a-b' },
        { via: '10.0.2.2', interface: 'a-c' },
      ],
      protocol: 'ospf',
    })
  })

  it('reads a connected route, which has no next hop, and a deleted one', () => {
    expect(
      parseEventLine('fib b [2026-11-12T17:33:20.000001] 10.0.1.0/30 dev b-a proto kernel scope link src 10.0.1.2 ')
        ?.event
    ).toMatchObject({ type: 'fib_install', via: null, interface: 'b-a', protocol: 'kernel' })
    expect(
      parseEventLine(
        'fib a [2026-11-12T17:33:53.110831] Deleted 10.255.0.3 nhid 19 via 10.0.2.2 dev a-c proto ospf metric 20 '
      )?.event
    ).toEqual({ type: 'fib_remove', router: 'a', prefix: '10.255.0.3' })
  })

  it('reads a probe’s reply and a missing one', () => {
    expect(
      parseEventLine('probe direct [1794504832.282240] 64 bytes from 10.255.0.3: icmp_seq=15 ttl=64 time=0.375 ms')
    ).toEqual({
      timeMs: 1794504832282.24,
      event: { type: 'probe_received', probe: 'direct', sequence: 15, rttMs: 0.375 },
    })
    expect(parseEventLine('probe direct [1794504832.697922] no answer yet for icmp_seq=16')).toEqual({
      timeMs: 1794504832697.922,
      event: { type: 'probe_lost', probe: 'direct', sequence: 16 },
    })
  })

  it('reads the game’s own fault lines', () => {
    expect(parseEventLine('fault on a c 1794504832.462712')).toEqual({
      timeMs: 1794504832462.712,
      event: { type: 'fault_injected', link: ['a', 'c'] },
    })
    expect(parseEventLine('fault off a c 1794504838.5\r')).toBeNull()
    expect(parseEventLine('fault off a c 1794504838.500000\r')?.event).toEqual({
      type: 'fault_cleared',
      link: ['a', 'c'],
    })
  })

  it('passes over everything else in a log', () => {
    for (const line of [
      'frr a 2026/11/12 17:33:53.090 OSPF: [PBVCE-PQKR1] NSM[a-c:10.0.2.1:10.255.0.3:default]: Full (InactivityTimer)',
      'frr a 2026/11/12 17:33:43.956 BFD: [PSB4R-8T1TJ] session-new: mhop:no peer:10.0.2.2 local:10.0.2.1 vrf:default ifname:a-c',
      'frr a 2026/11/12 17:33:45.271 BFD: [W4WS3-T557J]   calculated xmt_TO=300000 (using slowest rate)',
      'frr a 2026/11/12 16:32:53.757 BFD: [VQK5M-9G0V1][EC 100663315] CPU starvation: late',
      'probe direct PING 10.255.0.3 (10.255.0.3) from 10.255.0.1 : 56(84) bytes of data.',
      'fib a ',
      'garbage',
      '',
    ]) {
      expect(parseEventLine(line)).toBeNull()
    }
  })
})
