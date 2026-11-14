import { describe } from 'vitest'
import { goldenMission, itJudgesEveryRun } from '#test/index'

// Runs recorded on the real Machine by `pnpm vm:golden the-shared-map`.
const golden = goldenMission('the-shared-map')

describe('The Shared Map, on the Machine', () => {
  itJudgesEveryRun(golden, {
    start: { 'learned-c': false, 'reaches-c': false },
    // The right lines on a, whose loopback is already in OSPF.
    'wrong-router': { 'learned-c': false, 'reaches-c': false },
    // Passive without an area: c's lo is still outside OSPF.
    'passive-only': { 'learned-c': false, 'reaches-c': false },
    'lo-in-area-0': { 'learned-c': true, 'reaches-c': true },
  })
})
