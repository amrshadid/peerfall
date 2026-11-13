import { describe } from 'vitest'
import { goldenMission, itJudgesEveryRun } from '#test/index'

// Runs recorded on the real Machine by `pnpm vm:golden one-hop-further`, judged again here.
describe('One Hop Further, on the Machine', () => {
  itJudgesEveryRun(goldenMission('one-hop-further'), {
    start: { 'a-route': false, 'a-reaches-c': false },
    // c's own address as the next hop: a can't reach it directly, and the route is not used.
    'next-hop-too-far': { 'a-route': false, 'a-reaches-c': false },
    'through-b': { 'a-route': true, 'a-reaches-c': true },
  })
})
