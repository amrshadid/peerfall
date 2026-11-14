import { describe } from 'vitest'
import { goldenMission, itJudgesEveryRun } from '#test/index'

// Runs recorded on the real Machine by `pnpm vm:golden the-cheaper-way`. Each way is judged in
// the kernel's route at the router that sends: costs count where a packet leaves.
const golden = goldenMission('the-cheaper-way')

describe('The Cheaper Way, on the Machine', () => {
  itJudgesEveryRun(golden, {
    start: { 'a-through-c': false, 'd-through-c': false },
    // a's end only: a's traffic moves to c, d's still comes back through b.
    'one-end': { 'a-through-c': true, 'd-through-c': false },
    // b's end only: d's way back moves, a's way out does not.
    'wrong-end': { 'a-through-c': false, 'd-through-c': true },
    // A tie: two next hops each way, not c alone.
    tie: { 'a-through-c': false, 'd-through-c': false },
    'raise-a-b': { 'a-through-c': true, 'd-through-c': true },
    'lower-c-d': { 'a-through-c': true, 'd-through-c': true },
    // Judged by where the traffic goes, not how: a link shut down moves it too.
    'shut-a-b': { 'a-through-c': true, 'd-through-c': true },
  })
})
