import { describe } from 'vitest'
import { goldenMission, itJudgesEveryRun } from '#test/index'

// Runs recorded on the real Machine by `pnpm vm:golden never-reached-full`. Full alone is not
// enough: a packet with 2000 bytes of data must cross the link too.
const golden = goldenMission('never-reached-full')

describe('Never Reached Full, on the Machine', () => {
  itJudgesEveryRun(golden, {
    start: { full: false, 'large-packet': false },
    // OSPF started again: the two ends still disagree on the MTU.
    'restart-ospf': { full: false, 'large-packet': false },
    // OSPF stops comparing MTUs: Full, and large packets are still lost.
    'mtu-ignore': { full: true, 'large-packet': false },
    'match-1500': { full: true, 'large-packet': true },
    // Both ends at 9000 agree as well.
    'match-9000': { full: true, 'large-packet': true },
  })
})
