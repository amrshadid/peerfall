import { describe } from 'vitest'
import { goldenMission, itJudgesEveryRun } from '#test/index'

// Runs recorded on the real Machine by `pnpm vm:golden two-ends-of-one-cable`, judged again here.
describe('Two Ends of One Cable, on the Machine', () => {
  itJudgesEveryRun(goldenMission('two-ends-of-one-cable'), {
    start: { 'a-connected': false, 'b-connected': false, 'a-reaches-b': false },
    // One end only: a has its route, and nobody answers at the other end.
    'one-end': { 'a-connected': true, 'b-connected': false, 'a-reaches-b': false },
    // Both ends addressed, in two different networks.
    'two-networks': { 'a-connected': true, 'b-connected': false, 'a-reaches-b': false },
    // The ends swapped: neither has its own address, and a answers its own ping to 10.0.1.2.
    'swapped-ends': { 'a-connected': false, 'b-connected': false, 'a-reaches-b': true },
    // b copies a's address: b has the connected route and not its own address.
    'b-takes-as-address': { 'a-connected': true, 'b-connected': false, 'a-reaches-b': false },
    'both-ends': { 'a-connected': true, 'b-connected': true, 'a-reaches-b': true },
    // The same outcome from Linux: judged by what the kernel has, not by which command put it there.
    'addressed-from-linux': { 'a-connected': true, 'b-connected': true, 'a-reaches-b': true },
  })
})
