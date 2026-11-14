// What FRR 10.6.1 printed on the Machine for the link-state parts of a router's state, copied from
// one run (2026-11-14), each through `vtysh -N <router> -c '<command>' 2>&1 | cat` as root reads it.

/** Router a of an OSPF square (a–b, a–c, b–d, c–d), every link point-to-point: two Full peers. */
export const OSPF_NEIGHBORS_FULL = `{
  "neighbors":{
    "10.255.0.2":[
      {
        "nbrState":"Full\\/-",
        "nbrPriority":1,
        "converged":"Full",
        "role":"DROther",
        "upTimeInMsec":23953,
        "routerDeadIntervalTimerDueMsec":35968,
        "upTime":"23.953s",
        "deadTime":"35.968s",
        "ifaceAddress":"10.0.1.2",
        "ifaceName":"a-b:10.0.1.1",
        "linkStateRetransmissionListCounter":0,
        "linkStateRequestListCounter":0,
        "databaseSummaryListCounter":0
      }
    ],
    "10.255.0.3":[
      {
        "nbrState":"Full\\/-",
        "nbrPriority":1,
        "converged":"Full",
        "role":"DROther",
        "upTimeInMsec":23230,
        "routerDeadIntervalTimerDueMsec":36713,
        "upTime":"23.230s",
        "deadTime":"36.713s",
        "ifaceAddress":"10.0.2.2",
        "ifaceName":"a-c:10.0.2.1",
        "linkStateRetransmissionListCounter":0,
        "linkStateRequestListCounter":0,
        "databaseSummaryListCounter":0
      }
    ]
  }
}
`

/** Router a of a pair whose far end b-a has MTU 9000 against a's 1500: the peer stops at ExStart. */
export const OSPF_NEIGHBORS_EXSTART = `{
  "neighbors":{
    "10.255.0.2":[
      {
        "nbrState":"ExStart\\/-",
        "nbrPriority":1,
        "converged":"ExStart",
        "role":"DROther",
        "upTimeInMsec":21492,
        "routerDeadIntervalTimerDueMsec":38507,
        "upTime":"21.492s",
        "deadTime":"38.507s",
        "ifaceAddress":"10.0.1.2",
        "ifaceName":"a-b:10.0.1.1",
        "linkStateRetransmissionListCounter":0,
        "linkStateRequestListCounter":0,
        "databaseSummaryListCounter":0
      }
    ]
  }
}
`

/**
 * Router a of the square, with d's loopback in area 1 (d is a border router, and hands it on as a
 * summary) and a static route on d brought into OSPF (an external LSA).
 */
export const OSPF_DATABASE = `{
  "routerId":"10.255.0.1",
  "areas":{
    "0.0.0.0":{
      "routerLinkStates":[
        {
          "lsId":"10.255.0.1",
          "advertisedRouter":"10.255.0.1",
          "lsaAge":23,
          "sequenceNumber":"80000005",
          "checksum":"5234",
          "numOfRouterLinks":5
        },
        {
          "lsId":"10.255.0.2",
          "advertisedRouter":"10.255.0.2",
          "lsaAge":23,
          "sequenceNumber":"80000005",
          "checksum":"f48b",
          "numOfRouterLinks":5
        },
        {
          "lsId":"10.255.0.3",
          "advertisedRouter":"10.255.0.3",
          "lsaAge":24,
          "sequenceNumber":"80000005",
          "checksum":"93e5",
          "numOfRouterLinks":5
        },
        {
          "lsId":"10.255.0.4",
          "advertisedRouter":"10.255.0.4",
          "lsaAge":19,
          "sequenceNumber":"80000006",
          "checksum":"885",
          "numOfRouterLinks":4
        }
      ],
      "routerLinkStatesCount":4,
      "summaryLinkStates":[
        {
          "lsId":"10.255.0.4",
          "advertisedRouter":"10.255.0.4",
          "lsaAge":34,
          "sequenceNumber":"80000001",
          "checksum":"4ef2",
          "summaryAddress":"10.255.0.4/32"
        }
      ],
      "summaryLinkStatesCount":1
    }
  },
  "asExternalLinkStates":[
    {
      "lsId":"192.0.2.0",
      "advertisedRouter":"10.255.0.4",
      "lsaAge":33,
      "sequenceNumber":"80000001",
      "checksum":"5994",
      "metricType":"E2",
      "route":"192.0.2.0/24",
      "tag":0
    }
  ],
  "asExternalLinkStatesCount":1
}
`

/** `ip -o route show` on router a of the square: d's loopback over both equal paths. */
export const ECMP_ROUTES = [
  '10.0.1.0/30 dev a-b proto kernel scope link src 10.0.1.1 ',
  '10.0.2.0/30 dev a-c proto kernel scope link src 10.0.2.1 ',
  '10.0.3.0/30 nhid 15 via 10.0.1.2 dev a-b proto ospf metric 20 ',
  '10.0.4.0/30 nhid 17 via 10.0.2.2 dev a-c proto ospf metric 20 ',
  '10.255.0.2 nhid 15 via 10.0.1.2 dev a-b proto ospf metric 20 ',
  '10.255.0.3 nhid 17 via 10.0.2.2 dev a-c proto ospf metric 20 ',
  '10.255.0.4 nhid 21 proto ospf metric 20 \\\tnexthop via 10.0.1.2 dev a-b weight 1 \\\tnexthop via 10.0.2.2 dev a-c weight 1 ',
  '192.0.2.0/24 nhid 21 proto ospf metric 20 \\\tnexthop via 10.0.1.2 dev a-b weight 1 \\\tnexthop via 10.0.2.2 dev a-c weight 1 ',
  '',
].join('\n')

/** Router a of an OSPFv3 pair over link-local addresses, IPv6 loopbacks fd00::1 and fd00::2. */
export const OSPF6_NEIGHBORS_FULL = `{
  "neighbors":[
    {
      "neighborId":"10.255.0.2",
      "priority":1,
      "deadTime":"00:00:34",
      "state":"Full",
      "ifState":"PointToPoint",
      "duration":"00:00:15",
      "interfaceName":"a-b",
      "interfaceState":"PointToPoint"
    }
  ]
}
`

/** The same router's `show ipv6 route json`: b's loopback from OSPFv3 through b's link-local address. */
export const RIB6_OSPF6 = [
  '{"fd00::1/128":[{"prefix":"fd00::1/128","prefixLen":128,"protocol":"ospf6","vrfId":0,"vrfName":"default","distance":110,"metric":0,"table":254,"internalStatus":0,"internalFlags":0,"internalNextHopNum":1,"internalNextHopActiveNum":1,"internalNextHopFibInstalledNum":1,"nexthopGroupId":7,"receivedNexthopGroupId":7,"uptime":"00:00:26","nexthops":[{"flags":3,"fib":true,"directlyConnected":true,"interfaceIndex":1,"interfaceName":"lo","active":true,"weight":1}]},{"prefix":"fd00::1/128","prefixLen":128,"protocol":"local","vrfId":0,"vrfName":"default","distance":0,"metric":0,"installed":true,"table":254,"internalStatus":16,"internalFlags":0,"internalNextHopNum":1,"internalNextHopActiveNum":1,"internalNextHopFibInstalledNum":1,"nexthopGroupId":7,"receivedNexthopGroupId":7,"uptime":"00:00:41","nexthops":[{"flags":3,"fib":true,"directlyConnected":true,"interfaceIndex":1,"interfaceName":"lo","active":true,"weight":1}]},{"prefix":"fd00::1/128","prefixLen":128,"protocol":"connected","vrfId":0,"vrfName":"default","selected":true,"destSelected":true,"distance":0,"metric":0,"installed":true,"table":254,"internalStatus":16,"internalFlags":8,"internalNextHopNum":1,"internalNextHopActiveNum":1,"internalNextHopFibInstalledNum":1,"nexthopGroupId":7,"installedNexthopGroupId":7,"receivedNexthopGroupId":7,"uptime":"00:00:41","nexthops":[{"flags":3,"fib":true,"directlyConnected":true,"interfaceIndex":1,"interfaceName":"lo","active":true,"weight":1}]}]',
  ',"fd00::2/128":[{"prefix":"fd00::2/128","prefixLen":128,"protocol":"ospf6","vrfId":0,"vrfName":"default","selected":true,"destSelected":true,"distance":110,"metric":10,"installed":true,"table":254,"internalStatus":16,"internalFlags":8,"internalNextHopNum":1,"internalNextHopActiveNum":1,"internalNextHopFibInstalledNum":1,"nexthopGroupId":12,"installedNexthopGroupId":12,"receivedNexthopGroupId":12,"uptime":"00:00:10","nexthops":[{"flags":3,"fib":true,"ip":"fe80::8402:2aff:fea8:c6f9","afi":"ipv6","interfaceIndex":2,"interfaceName":"a-b","active":true,"weight":1}]}]',
  ',"fe80::/64":[{"prefix":"fe80::/64","prefixLen":64,"protocol":"connected","vrfId":0,"vrfName":"default","selected":true,"destSelected":true,"distance":0,"metric":0,"installed":true,"table":254,"internalStatus":16,"internalFlags":8,"internalNextHopNum":1,"internalNextHopActiveNum":1,"internalNextHopFibInstalledNum":1,"nexthopGroupId":8,"installedNexthopGroupId":8,"receivedNexthopGroupId":8,"uptime":"00:00:41","nexthops":[{"flags":3,"fib":true,"directlyConnected":true,"interfaceIndex":2,"interfaceName":"a-b","active":true,"weight":1}]}]',
  '}',
  '',
].join('\n')

/** Router a of an IS-IS pair, both level-2-only: b by its hostname, and lo's circuit with no adjacency. */
export const ISIS_NEIGHBORS_UP = `{
  "areas":[
    {
      "area":"core",
      "circuits":[
        {
          "circuit":0,
          "adj":"b",
          "interface":"a-b",
          "level":2,
          "state":"Up",
          "expires-in":"29s",
          "snpa":"2020.2020.2020"
        },
        {
          "circuit":0
        }
      ]
    }
  ]
}
`

/** What vtysh prints for a daemon that is not running, in place of its JSON. */
export const OSPFD_NOT_RUNNING = 'ospfd is not running\n'

/** A 2000-byte ping across the MTU mismatch: the large packet never comes back. */
export const PING_TOO_LARGE = `PING 10.0.1.2 (10.0.1.2) 2000(2028) bytes of data.

--- 10.0.1.2 ping statistics ---
3 packets transmitted, 0 received, 100% packet loss, time 415ms
`

/** An IPv6 ping, without -6: iputils' ping tells from the address. */
export const PING_IPV6 = `PING fd00::2 (fd00::2) 56 data bytes
64 bytes from fd00::2: icmp_seq=1 ttl=64 time=1.17 ms
64 bytes from fd00::2: icmp_seq=2 ttl=64 time=0.566 ms
64 bytes from fd00::2: icmp_seq=3 ttl=64 time=0.921 ms

--- fd00::2 ping statistics ---
3 packets transmitted, 3 received, 0% packet loss, time 403ms
rtt min/avg/max/mdev = 0.566/0.884/1.165/0.245 ms
`

/** The log lines E7's events are read from, as FRR wrote them on the Machine. */
export const OSPF6_ADJACENCY_LINE =
  'frr a 2026/11/14 11:23:16.233 OSPF6: [GHN28-AMRE7] AdjChg: Nbr 10.255.0.2(default) on 10.255.0.2%a-b: Loading -> Full (LoadingDone)'
export const ISIS_ADJACENCY_LINE =
  'frr a 2026/11/14 11:23:06.753 ISIS: [Q7SVW-YVKRH] %ADJCHANGE: Adjacency to 0000.0000.0002 (a-b) for level-2 changed from Initializing to Up, unspecified'
export const OSPF_MTU_LINE =
  "frr a 2026/11/14 11:23:11.359 OSPF: [XZZ9Y-NNTMQ][EC 134217741] Packet[DD]: Neighbor 10.255.0.2 MTU 9000 is larger than [a-b:10.0.1.1]'s MTU 1500"
