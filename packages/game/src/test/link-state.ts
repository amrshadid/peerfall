import type { MachineState } from '@peerfall/machine/types'
import { parseRouterState } from '@peerfall/machine/utils'

// What FRR 10.6.1 printed on the Machine (2026-11-14) for router a of four small networks, read
// through the Machine's own parser, as live judging reads it.

/** a of an OSPF square (a–b, a–c, b–d, c–d): two Full peers, d's loopback over both paths. */
const SQUARE_OSPF_NEIGHBORS = `{
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

/** The square's database on a: d is a border router (its loopback in area 1) and sends one external. */
const SQUARE_OSPF_DATABASE = `{
  "routerId":"10.255.0.1",
  "areas":{
    "0.0.0.0":{
      "routerLinkStates":[
        {"lsId":"10.255.0.1","advertisedRouter":"10.255.0.1","lsaAge":23,"sequenceNumber":"80000005","checksum":"5234","numOfRouterLinks":5},
        {"lsId":"10.255.0.2","advertisedRouter":"10.255.0.2","lsaAge":23,"sequenceNumber":"80000005","checksum":"f48b","numOfRouterLinks":5},
        {"lsId":"10.255.0.3","advertisedRouter":"10.255.0.3","lsaAge":24,"sequenceNumber":"80000005","checksum":"93e5","numOfRouterLinks":5},
        {"lsId":"10.255.0.4","advertisedRouter":"10.255.0.4","lsaAge":19,"sequenceNumber":"80000006","checksum":"885","numOfRouterLinks":4}
      ],
      "routerLinkStatesCount":4,
      "summaryLinkStates":[
        {"lsId":"10.255.0.4","advertisedRouter":"10.255.0.4","lsaAge":34,"sequenceNumber":"80000001","checksum":"4ef2","summaryAddress":"10.255.0.4/32"}
      ],
      "summaryLinkStatesCount":1
    }
  },
  "asExternalLinkStates":[
    {"lsId":"192.0.2.0","advertisedRouter":"10.255.0.4","lsaAge":33,"sequenceNumber":"80000001","checksum":"5994","metricType":"E2","route":"192.0.2.0/24","tag":0}
  ],
  "asExternalLinkStatesCount":1
}
`

const SQUARE_ROUTES = [
  '10.0.1.0/30 dev a-b proto kernel scope link src 10.0.1.1 ',
  '10.0.2.0/30 dev a-c proto kernel scope link src 10.0.2.1 ',
  '10.255.0.2 nhid 15 via 10.0.1.2 dev a-b proto ospf metric 20 ',
  '10.255.0.4 nhid 21 proto ospf metric 20 \\\tnexthop via 10.0.1.2 dev a-b weight 1 \\\tnexthop via 10.0.2.2 dev a-c weight 1 ',
  '',
].join('\n')

/** a of a pair whose far end has MTU 9000 against a's 1500: b stops at ExStart. */
const MTU_OSPF_NEIGHBORS = `{
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

/** a of an OSPFv3 pair, IPv6 loopbacks fd00::1 and fd00::2. */
const OSPF6_NEIGHBORS = `{
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

const OSPF6_RIB6 = [
  '{"fd00::1/128":[{"prefix":"fd00::1/128","prefixLen":128,"protocol":"ospf6","vrfId":0,"vrfName":"default","distance":110,"metric":0,"table":254,"internalStatus":0,"internalFlags":0,"internalNextHopNum":1,"internalNextHopActiveNum":1,"internalNextHopFibInstalledNum":1,"nexthopGroupId":7,"receivedNexthopGroupId":7,"uptime":"00:00:26","nexthops":[{"flags":3,"fib":true,"directlyConnected":true,"interfaceIndex":1,"interfaceName":"lo","active":true,"weight":1}]},{"prefix":"fd00::1/128","prefixLen":128,"protocol":"local","vrfId":0,"vrfName":"default","distance":0,"metric":0,"installed":true,"table":254,"internalStatus":16,"internalFlags":0,"internalNextHopNum":1,"internalNextHopActiveNum":1,"internalNextHopFibInstalledNum":1,"nexthopGroupId":7,"receivedNexthopGroupId":7,"uptime":"00:00:41","nexthops":[{"flags":3,"fib":true,"directlyConnected":true,"interfaceIndex":1,"interfaceName":"lo","active":true,"weight":1}]},{"prefix":"fd00::1/128","prefixLen":128,"protocol":"connected","vrfId":0,"vrfName":"default","selected":true,"destSelected":true,"distance":0,"metric":0,"installed":true,"table":254,"internalStatus":16,"internalFlags":8,"internalNextHopNum":1,"internalNextHopActiveNum":1,"internalNextHopFibInstalledNum":1,"nexthopGroupId":7,"installedNexthopGroupId":7,"receivedNexthopGroupId":7,"uptime":"00:00:41","nexthops":[{"flags":3,"fib":true,"directlyConnected":true,"interfaceIndex":1,"interfaceName":"lo","active":true,"weight":1}]}]',
  ',"fd00::2/128":[{"prefix":"fd00::2/128","prefixLen":128,"protocol":"ospf6","vrfId":0,"vrfName":"default","selected":true,"destSelected":true,"distance":110,"metric":10,"installed":true,"table":254,"internalStatus":16,"internalFlags":8,"internalNextHopNum":1,"internalNextHopActiveNum":1,"internalNextHopFibInstalledNum":1,"nexthopGroupId":12,"installedNexthopGroupId":12,"receivedNexthopGroupId":12,"uptime":"00:00:10","nexthops":[{"flags":3,"fib":true,"ip":"fe80::8402:2aff:fea8:c6f9","afi":"ipv6","interfaceIndex":2,"interfaceName":"a-b","active":true,"weight":1}]}]',
  '}',
  '',
].join('\n')

/** a of an IS-IS pair, both level-2-only. */
const ISIS_NEIGHBORS = `{
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

const parts = (sections: Readonly<Record<string, string>>) =>
  parseRouterState(
    Object.entries(sections)
      .map(([part, output]) => `__PF_STATE__ ${part}\n${output}`)
      .join('')
  )

/** Each network's router a under its own name, so one state holds all four. */
export const LINK_STATE: MachineState = {
  routers: {
    square: parts({
      ospfNeighbors: SQUARE_OSPF_NEIGHBORS,
      ospfDatabase: SQUARE_OSPF_DATABASE,
      routes: SQUARE_ROUTES,
    }),
    mtu: parts({ ospfNeighbors: MTU_OSPF_NEIGHBORS }),
    ipv6: parts({ ospf6Neighbors: OSPF6_NEIGHBORS, rib6: OSPF6_RIB6, ospfNeighbors: 'ospfd is not running\n' }),
    isis: parts({ isisNeighbors: ISIS_NEIGHBORS, ospfDatabase: 'ospfd is not running\n' }),
  },
  pings: [
    // A 2000-byte ping across the MTU mismatch, a small one, and an IPv6 one, as ping reported them.
    { from: 'mtu', to: '10.0.1.2', size: 2000, sent: 3, received: 0 },
    { from: 'mtu', to: '10.0.1.2', sent: 3, received: 3 },
    { from: 'ipv6', to: 'fd00::2', sent: 3, received: 3 },
    // a's own IPv6 loopback, which a answers itself.
    { from: 'ipv6', to: 'fd00::1', sent: 3, received: 3 },
  ],
}
