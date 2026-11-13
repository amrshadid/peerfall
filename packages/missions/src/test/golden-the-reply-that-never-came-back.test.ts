import { describe } from 'vitest'
import { goldenMission, itJudgesEveryRun } from '#test/index'

// Runs recorded on the real Machine by `pnpm vm:golden the-reply-that-never-came-back`, judged again here.
describe('The Reply That Never Came Back, on the Machine', () => {
  itJudgesEveryRun(goldenMission('the-reply-that-never-came-back'), {
    start: { 'c-route-back': false, 'a-reaches-c': false },
    // The way back through an address c cannot reach: the route is not used.
    'next-hop-too-far': { 'c-route-back': false, 'a-reaches-c': false },
    // The way back written on b, which already has a connected route to a: c still has none.
    'route-on-b': { 'c-route-back': false, 'a-reaches-c': false },
    'way-back': { 'c-route-back': true, 'a-reaches-c': true },
    // A default route back: the kernel uses it for 10.0.1.1 too.
    'default-route-back': { 'c-route-back': true, 'a-reaches-c': true },
  })
})
