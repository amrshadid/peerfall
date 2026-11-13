import { describe, expect, it } from 'vitest'
import {
  parseDaemons,
  parseInterfaces,
  parseKernelRoutes,
  parsePing,
  parseRibRoutes,
  parseRouterState,
  pingLine,
  routerStateLine,
  stateRequestProblems,
} from '#utils/state/machine-state.util'

// Every output below is copied from the Machine (FRR 10.6.1, iproute2 and iputils on Alpine 3.24).
const DAEMONS_UP = ' mgmtd zebra staticd watchfrr\n'
const DAEMONS_DOWN = 'Exiting: failed to connect to any daemons.\n'
const ROUTES = [
  'default nhid 6 via 10.0.1.2 dev a-b proto static metric 20 ',
  '10.0.1.0/30 dev a-b proto kernel scope link src 10.0.1.1 ',
  '10.9.9.0/24 nhid 6 via 10.0.1.2 dev a-b proto static metric 20 ',
  'blackhole 192.0.2.0/24 proto static metric 20 ',
  '',
].join('\n')
const EQUAL_COST =
  '10.9.0.0/24 nhid 14 proto static metric 20 \\\tnexthop via 10.0.1.1 dev b-a weight 1 \\\tnexthop via 10.0.2.2 dev b-c weight 1 \n'
const RUNNING = [
  'Building configuration...',
  '',
  'Current configuration:',
  '!',
  'frr version 10.6.1',
  'frr defaults traditional',
  'hostname a',
  'log file /var/log/frr/a.log',
  'log timestamp precision 3',
  'service integrated-vtysh-config',
  '!',
  'interface a-b',
  ' ip address 10.0.1.1/30',
  'exit',
  '!',
  'end',
  '',
].join('\n')
const SAVED = 'frr defaults traditional\nhostname a\nlog file /var/log/frr/a.log\nlog timestamp precision 3\n!\n'
// Router a of The Backup Path: `show ip route json` as it starts, one static route through b.
const RIB_TABLE = [
  '{"10.0.1.0/30":[{"prefix":"10.0.1.0/30","prefixLen":30,"protocol":"connected","vrfId":0,"vrfName":"default","selected":true,"destSelected":true,"distance":0,"metric":0,"installed":true,"table":254,"internalStatus":16,"internalFlags":8,"internalNextHopNum":1,"internalNextHopActiveNum":1,"internalNextHopFibInstalledNum":1,"nexthopGroupId":5,"installedNexthopGroupId":5,"receivedNexthopGroupId":5,"uptime":"00:00:18","nexthops":[{"flags":3,"fib":true,"directlyConnected":true,"interfaceIndex":2,"interfaceName":"a-b","active":true,"weight":1}]}]',
  ',"10.0.1.1/32":[{"prefix":"10.0.1.1/32","prefixLen":32,"protocol":"local","vrfId":0,"vrfName":"default","selected":true,"destSelected":true,"distance":0,"metric":0,"installed":true,"table":254,"internalStatus":16,"internalFlags":8,"internalNextHopNum":1,"internalNextHopActiveNum":1,"internalNextHopFibInstalledNum":1,"nexthopGroupId":5,"installedNexthopGroupId":5,"receivedNexthopGroupId":5,"uptime":"00:00:18","nexthops":[{"flags":3,"fib":true,"directlyConnected":true,"interfaceIndex":2,"interfaceName":"a-b","active":true,"weight":1}]}]',
  ',"10.0.2.0/30":[{"prefix":"10.0.2.0/30","prefixLen":30,"protocol":"connected","vrfId":0,"vrfName":"default","selected":true,"destSelected":true,"distance":0,"metric":0,"installed":true,"table":254,"internalStatus":16,"internalFlags":8,"internalNextHopNum":1,"internalNextHopActiveNum":1,"internalNextHopFibInstalledNum":1,"nexthopGroupId":6,"installedNexthopGroupId":6,"receivedNexthopGroupId":6,"uptime":"00:00:18","nexthops":[{"flags":3,"fib":true,"directlyConnected":true,"interfaceIndex":3,"interfaceName":"a-c","active":true,"weight":1}]}]',
  ',"10.0.2.1/32":[{"prefix":"10.0.2.1/32","prefixLen":32,"protocol":"local","vrfId":0,"vrfName":"default","selected":true,"destSelected":true,"distance":0,"metric":0,"installed":true,"table":254,"internalStatus":16,"internalFlags":8,"internalNextHopNum":1,"internalNextHopActiveNum":1,"internalNextHopFibInstalledNum":1,"nexthopGroupId":6,"installedNexthopGroupId":6,"receivedNexthopGroupId":6,"uptime":"00:00:18","nexthops":[{"flags":3,"fib":true,"directlyConnected":true,"interfaceIndex":3,"interfaceName":"a-c","active":true,"weight":1}]}]',
  ',"10.255.0.3/32":[{"prefix":"10.255.0.3/32","prefixLen":32,"protocol":"static","vrfId":0,"vrfName":"default","selected":true,"destSelected":true,"distance":1,"metric":0,"installed":true,"table":254,"internalStatus":16,"internalFlags":73,"internalNextHopNum":1,"internalNextHopActiveNum":1,"internalNextHopFibInstalledNum":1,"nexthopGroupId":10,"installedNexthopGroupId":10,"receivedNexthopGroupId":10,"uptime":"00:00:05","nexthops":[{"flags":3,"fib":true,"ip":"10.0.1.2","afi":"ipv4","interfaceIndex":2,"interfaceName":"a-b","active":true,"weight":1}]}]',
  '}',
  '',
].join('\n')
// The same router with the route through b given distance 10: it waits, neither selected nor installed.
const RIB_FLOATING = `{
  "10.255.0.3/32":[
    {
      "prefix":"10.255.0.3/32",
      "prefixLen":32,
      "protocol":"static",
      "vrfId":0,
      "vrfName":"default",
      "distance":10,
      "metric":0,
      "table":254,
      "internalStatus":0,
      "internalFlags":65,
      "internalNextHopNum":1,
      "internalNextHopActiveNum":1,
      "internalNextHopFibInstalledNum":1,
      "nexthopGroupId":10,
      "receivedNexthopGroupId":10,
      "uptime":"00:00:02",
      "nexthops":[
        {
          "flags":3,
          "fib":true,
          "ip":"10.0.1.2",
          "afi":"ipv4",
          "interfaceIndex":2,
          "interfaceName":"a-b",
          "active":true,
          "weight":1
        }
      ],
      "flags":65,
      "status":0
    },
    {
      "prefix":"10.255.0.3/32",
      "prefixLen":32,
      "protocol":"static",
      "vrfId":0,
      "vrfName":"default",
      "selected":true,
      "destSelected":true,
      "distance":1,
      "metric":0,
      "installed":true,
      "table":254,
      "internalStatus":16,
      "internalFlags":73,
      "internalNextHopNum":1,
      "internalNextHopActiveNum":1,
      "internalNextHopFibInstalledNum":1,
      "nexthopGroupId":15,
      "installedNexthopGroupId":15,
      "receivedNexthopGroupId":15,
      "uptime":"00:00:02",
      "nexthops":[
        {
          "flags":3,
          "fib":true,
          "ip":"10.0.2.2",
          "afi":"ipv4",
          "interfaceIndex":3,
          "interfaceName":"a-c",
          "active":true,
          "weight":1
        }
      ],
      "flags":73,
      "status":16
    }
  ]
}
`

describe('the daemons vtysh reached', () => {
  it('names each one that answered', () => {
    expect(parseDaemons(DAEMONS_UP)).toEqual(['mgmtd', 'zebra', 'staticd', 'watchfrr'])
  })

  it('is empty when FRR is not running', () => {
    expect(parseDaemons(DAEMONS_DOWN)).toEqual([])
    expect(parseDaemons('')).toEqual([])
  })
})

describe('the kernel routing table', () => {
  it('reads connected, static, default and blackhole routes', () => {
    expect(parseKernelRoutes(ROUTES)).toEqual([
      { prefix: 'default', protocol: 'static', nextHops: [{ via: '10.0.1.2', interface: 'a-b' }] },
      { prefix: '10.0.1.0/30', protocol: 'kernel', nextHops: [{ via: null, interface: 'a-b' }] },
      { prefix: '10.9.9.0/24', protocol: 'static', nextHops: [{ via: '10.0.1.2', interface: 'a-b' }] },
      { prefix: '192.0.2.0/24', protocol: 'static', nextHops: [] },
    ])
  })

  it('keeps every next hop of an equal-cost route', () => {
    expect(parseKernelRoutes(EQUAL_COST)).toEqual([
      {
        prefix: '10.9.0.0/24',
        protocol: 'static',
        nextHops: [
          { via: '10.0.1.1', interface: 'b-a' },
          { via: '10.0.2.2', interface: 'b-c' },
        ],
      },
    ])
  })

  it('is empty for an empty table or an error', () => {
    expect(parseKernelRoutes('')).toEqual([])
    expect(parseKernelRoutes('Cannot open network namespace "zz": No such file or directory\n')).toEqual([])
  })
})

// `ip -o link show` on The Dark Cable's network: a-c switched off on a (FRR's `shutdown`), then
// switched on, then dropping every packet with tc netem.
const LO =
  '1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN mode DEFAULT group default qlen 1000\\    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00\n'
const LINKS_A_DARK = `${LO}${[
  '2: a-b@if2: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP mode DEFAULT group default qlen 1000\\    link/ether 06:fe:4e:bf:aa:a1 brd ff:ff:ff:ff:ff:ff link-netns b',
  '3: a-c@if2: <BROADCAST,MULTICAST> mtu 1500 qdisc noqueue state DOWN mode DEFAULT group default qlen 1000\\    link/ether e6:4b:42:80:55:3b brd ff:ff:ff:ff:ff:ff link-netns c',
  '',
].join('\n')}`
const LINKS_C_DARK = `${LO}2: c-a@if3: <NO-CARRIER,BROADCAST,MULTICAST,UP> mtu 1500 qdisc noqueue state DOWN mode DEFAULT group default qlen 1000\\    link/ether 32:5e:4d:c7:ef:30 brd ff:ff:ff:ff:ff:ff link-netns a\n`
const LINKS_C_NETEM = `${LO}2: c-a@if3: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc netem state UP mode DEFAULT group default qlen 1000\\    link/ether 32:5e:4d:c7:ef:30 brd ff:ff:ff:ff:ff:ff link-netns a\n`

describe('a router’s interfaces', () => {
  it('has no carrier on an end switched off, nor on its far end', () => {
    expect(parseInterfaces(LINKS_A_DARK)).toEqual([
      { name: 'lo', carrier: true },
      { name: 'a-b', carrier: true },
      { name: 'a-c', carrier: false },
    ])
    expect(parseInterfaces(LINKS_C_DARK)).toEqual([
      { name: 'lo', carrier: true },
      { name: 'c-a', carrier: false },
    ])
  })

  it('keeps the carrier of a link that drops every packet', () => {
    expect(parseInterfaces(LINKS_C_NETEM.replaceAll('\n', '\r\n'))).toEqual([
      { name: 'lo', carrier: true },
      { name: 'c-a', carrier: true },
    ])
  })

  it('is empty when the namespace is gone', () => {
    expect(parseInterfaces('Cannot open network namespace "zz": No such file or directory\n')).toEqual([])
  })

  it('is read with the other parts of a router', () => {
    expect(routerStateLine('a', ['links'])).toBe('echo __PF_STATE__ links; ip -n a -o link show 2>&1; true')
    expect(parseRouterState(`__PF_STATE__ links\n${LINKS_C_DARK}`)).toEqual({
      links: [
        { name: 'lo', carrier: true },
        { name: 'c-a', carrier: false },
      ],
    })
  })
})

describe('zebra’s routing table', () => {
  it('reads every route of the table, connected and static', () => {
    const routes = parseRibRoutes(RIB_TABLE)
    expect(routes.map((route) => `${route.protocol} ${route.prefix}`)).toEqual([
      'connected 10.0.1.0/30',
      'local 10.0.1.1/32',
      'connected 10.0.2.0/30',
      'local 10.0.2.1/32',
      'static 10.255.0.3/32',
    ])
    expect(routes[0]?.nextHops).toEqual([{ via: null, interface: 'a-b' }])
    expect(routes[4]).toEqual({
      prefix: '10.255.0.3/32',
      protocol: 'static',
      distance: 1,
      metric: 0,
      selected: true,
      installed: true,
      nextHops: [{ via: '10.0.1.2', interface: 'a-b' }],
    })
  })

  it('keeps a route zebra did not select, which FRR prints without selected or installed', () => {
    expect(parseRibRoutes(RIB_FLOATING)).toEqual([
      {
        prefix: '10.255.0.3/32',
        protocol: 'static',
        distance: 10,
        metric: 0,
        selected: false,
        installed: false,
        nextHops: [{ via: '10.0.1.2', interface: 'a-b' }],
      },
      {
        prefix: '10.255.0.3/32',
        protocol: 'static',
        distance: 1,
        metric: 0,
        selected: true,
        installed: true,
        nextHops: [{ via: '10.0.2.2', interface: 'a-c' }],
      },
    ])
  })

  it('is empty for no route, or when zebra does not answer', () => {
    expect(parseRibRoutes('{}\n')).toEqual([])
    expect(parseRibRoutes(DAEMONS_DOWN)).toEqual([])
    expect(parseRibRoutes('')).toEqual([])
  })
})

describe('one router’s state', () => {
  it('reads zebra’s table through a pipe, and splits it back out', () => {
    expect(routerStateLine('a', ['rib'])).toBe(
      "echo __PF_STATE__ rib; vtysh -N a -c 'show ip route json' 2>&1 | cat; true"
    )
    expect(parseRouterState(`__PF_STATE__ rib\r\n${RIB_FLOATING.replaceAll('\n', '\r\n')}`).rib).toHaveLength(2)
    expect(parseRouterState(`__PF_STATE__ rib\n${DAEMONS_DOWN}`)).toEqual({ rib: [] })
  })

  it('asks for each part after a line that names it, and never fails the line', () => {
    expect(routerStateLine('a', ['daemons', 'savedConfig'])).toBe(
      "echo __PF_STATE__ daemons; vtysh -N a -c 'show daemons' 2>&1; echo __PF_STATE__ savedConfig; cat /etc/frr/a/frr.conf 2>/dev/null; true"
    )
  })

  it('splits what the line printed back into its parts', () => {
    const output = [
      `__PF_STATE__ daemons\n${DAEMONS_UP}`,
      `__PF_STATE__ routes\n${ROUTES}`,
      `__PF_STATE__ runningConfig\n${RUNNING}`,
      `__PF_STATE__ savedConfig\n${SAVED}`,
    ].join('')
    const state = parseRouterState(output.replaceAll('\n', '\r\n'))
    expect(state.daemons).toEqual(['mgmtd', 'zebra', 'staticd', 'watchfrr'])
    expect(state.routes).toHaveLength(4)
    expect(state.runningConfig).toBe(
      'frr version 10.6.1\nfrr defaults traditional\nhostname a\nlog file /var/log/frr/a.log\nlog timestamp precision 3\nservice integrated-vtysh-config\n!\ninterface a-b\n ip address 10.0.1.1/30\nexit\n!\n'
    )
    expect(state.savedConfig).toBe(SAVED)
  })

  it('has no running configuration while FRR is down, and no saved one without a frr.conf', () => {
    const output = `__PF_STATE__ daemons\n${DAEMONS_DOWN}__PF_STATE__ runningConfig\n${DAEMONS_DOWN}__PF_STATE__ savedConfig\n`
    expect(parseRouterState(output)).toEqual({ daemons: [], runningConfig: null, savedConfig: null })
  })

  it('reads the frr.conf FRR last started from, and has none before FRR was started with its init script', () => {
    expect(routerStateLine('a', ['startedConfig'])).toBe(
      'echo __PF_STATE__ startedConfig; cat /run/pf-started-a.conf 2>/dev/null; true'
    )
    expect(parseRouterState(`__PF_STATE__ startedConfig\n${SAVED}`)).toEqual({ startedConfig: SAVED })
    expect(parseRouterState('__PF_STATE__ startedConfig\n')).toEqual({ startedConfig: null })
  })

  it('leaves out the parts that were not asked for', () => {
    expect(parseRouterState(`__PF_STATE__ daemons\n${DAEMONS_UP}`)).toEqual({
      daemons: ['mgmtd', 'zebra', 'staticd', 'watchfrr'],
    })
  })
})

describe('a ping', () => {
  const request = { from: 'a', to: '10.0.1.2', count: 3 }

  it('is sent from the router’s namespace and never fails the line', () => {
    expect(pingLine(request)).toBe('ip netns exec a ping -c 3 -i 0.2 -W 1 10.0.1.2 2>&1; true')
  })

  it('counts the replies', () => {
    const output = [
      'PING 10.0.1.2 (10.0.1.2) 56(84) bytes of data.',
      '64 bytes from 10.0.1.2: icmp_seq=1 ttl=64 time=2.99 ms',
      '64 bytes from 10.0.1.2: icmp_seq=2 ttl=64 time=16.6 ms',
      '64 bytes from 10.0.1.2: icmp_seq=3 ttl=64 time=1.15 ms',
      '',
      '--- 10.0.1.2 ping statistics ---',
      '3 packets transmitted, 3 received, 0% packet loss, time 502ms',
      'rtt min/avg/max/mdev = 1.148/6.899/16.556/6.869 ms',
    ].join('\n')
    expect(parsePing(request, output)).toEqual({ from: 'a', to: '10.0.1.2', sent: 3, received: 3 })
  })

  it('counts none when a router on the way has no route', () => {
    const output = [
      'PING 10.77.0.1 (10.77.0.1) 56(84) bytes of data.',
      'From 10.0.1.2 icmp_seq=1 Destination Net Unreachable',
      'From 10.0.1.2 icmp_seq=2 Destination Net Unreachable',
      '',
      '--- 10.77.0.1 ping statistics ---',
      '3 packets transmitted, 0 received, +2 errors, 100% packet loss, time 686ms',
    ].join('\n')
    expect(parsePing({ ...request, to: '10.77.0.1' }, output)).toMatchObject({ sent: 3, received: 0 })
  })

  it('counts none when the router itself has no route and ping sends nothing', () => {
    expect(parsePing(request, 'ping: connect: Network unreachable\n')).toMatchObject({ sent: 3, received: 0 })
  })
})

describe('a state request’s problems', () => {
  it('finds nothing wrong with routers’ names, known parts and addresses', () => {
    expect(
      stateRequestProblems({ routers: { a: ['daemons', 'routes'] }, pings: [{ from: 'a', to: '10.0.1.2', count: 3 }] })
    ).toEqual([])
  })

  it('refuses anything that is not a plain shell word', () => {
    expect(
      stateRequestProblems({
        routers: { 'a; reboot': ['daemons'], b: ['secrets' as never] },
        pings: [{ from: 'a b', to: '10.0.1.2; reboot', count: 99 }],
      })
    ).toEqual([
      'routers: expected a router\'s name, got "a; reboot"',
      'routers.b: unknown part "secrets"',
      'pings[0].from: expected a router\'s name, got "a b"',
      'pings[0].to: expected an address like 10.0.1.2, got "10.0.1.2; reboot"',
      'pings[0].count: expected 1 to 10, got 99',
    ])
  })
})
