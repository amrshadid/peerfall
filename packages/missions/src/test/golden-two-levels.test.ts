import { describe } from 'vitest'
import { goldenMission, itJudgesEveryRun } from '#test/index'

// Runs recorded on the real Machine by `pnpm vm:golden two-levels`. The peer is judged at level 1,
// and the way out by the default route the attached bit gives.
const golden = goldenMission('two-levels')

describe('Two Levels, on the Machine', () => {
  itJudgesEveryRun(golden, {
    start: { 'b-is-a-peer': false, 'default-route': false, 'a-reaches-c': false },
    // a made level-2: peers at level 2, learns c's loopback itself, no default route.
    'level-2': { 'b-is-a-peer': false, 'default-route': false, 'a-reaches-c': true },
    // The right NET added beside the wrong one: a shares 49.0001 with b.
    'second-net': { 'b-is-a-peer': true, 'default-route': true, 'a-reaches-c': true },
    'move-net': { 'b-is-a-peer': true, 'default-route': true, 'a-reaches-c': true },
  })
})
