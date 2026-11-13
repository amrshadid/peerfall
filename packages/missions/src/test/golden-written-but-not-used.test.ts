import { describe } from 'vitest'
import { goldenMission, itJudgesEveryRun } from '#test/index'

// Runs recorded on the real Machine by `pnpm vm:golden written-but-not-used`, judged again here.
describe('Written but Not Used, on the Machine', () => {
  itJudgesEveryRun(goldenMission('written-but-not-used'), {
    start: { 'a-route': false, 'a-reaches-c': false },
    // Another next hop no connected network covers: still unresolved.
    'still-too-far': { 'a-route': false, 'a-reaches-c': false },
    // The wrong route removed and nothing written in its place.
    'removed-only': { 'a-route': false, 'a-reaches-c': false },
    fixed: { 'a-route': true, 'a-reaches-c': true },
    // The right route added, the wrong one left: only the right next hop reaches the kernel.
    'added-beside': { 'a-route': true, 'a-reaches-c': true },
  })
})
