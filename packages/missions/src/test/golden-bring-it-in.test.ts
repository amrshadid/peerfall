import { describe } from 'vitest'
import { goldenMission, itJudgesEveryRun } from '#test/index'

// Runs recorded on the real Machine by `pnpm vm:golden bring-it-in`.
const golden = goldenMission('bring-it-in')

describe('Bring It In, on the Machine', () => {
  itJudgesEveryRun(golden, {
    start: { 'a-learns-it': false, 'a-reaches-it': false },
    // c's connected routes instead of its static one: the customer's address stays out of OSPF.
    'redistribute-connected': { 'a-learns-it': false, 'a-reaches-it': false },
    // The right line on a, which holds no static route.
    'on-a': { 'a-learns-it': false, 'a-reaches-it': false },
    // A static route on a towards b: b has none, and the route is not OSPF's.
    'static-on-a': { 'a-learns-it': false, 'a-reaches-it': false },
    'redistribute-static': { 'a-learns-it': true, 'a-reaches-it': true },
  })
})
