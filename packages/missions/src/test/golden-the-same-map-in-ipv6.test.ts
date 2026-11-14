import { describe } from 'vitest'
import { goldenMission, itJudgesEveryRun } from '#test/index'

// Runs recorded on the real Machine by `pnpm vm:golden the-same-map-in-ipv6`. The route and the
// ping are IPv6: the rib check reads show ipv6 route json.
const golden = goldenMission('the-same-map-in-ipv6')

describe('The Same Map in IPv6, on the Machine', () => {
  itJudgesEveryRun(golden, {
    start: { 'b-is-a-peer': false, 'a-learns-c': false, 'a-reaches-c': false },
    // ospfd's command: ospfd does not run on a, and vtysh says so.
    'ospfv2-instead': { 'b-is-a-peer': false, 'a-learns-c': false, 'a-reaches-c': false },
    // Area 1 on a's end against area 0 on b's: no peer.
    'wrong-area': { 'b-is-a-peer': false, 'a-learns-c': false, 'a-reaches-c': false },
    'area-0': { 'b-is-a-peer': true, 'a-learns-c': true, 'a-reaches-c': true },
  })
})
